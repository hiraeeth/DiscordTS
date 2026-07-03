import { createHash, timingSafeEqual } from "crypto";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import color from "@/lib/colors";
import { tags } from "@/lib/tags";
import { config } from "config";
import { parse_duration } from "@/lib/duration";
import { rate_limiter } from "@/lib/ratelimit";
import { client } from "../client";
import { registration_of } from "../registry";
import { evaluate_rules } from "../rules";
import { scan, import_module, relative } from "./scan";
import type { RuleRequest } from "../rules";
import type { AuthConfig } from "../server_config";
import type { ZodType } from "zod";
import type { BaseRoute, RouteContext, ResponseControls, Verb } from "../base/route";

const VERBS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

type Handler = (context: RouteContext) => unknown;

interface ElysiaServer {
	requestIP?(request: Request): { address?: string } | null;
}

interface ElysiaContext {
	request: Request;
	params: Record<string, string>;
	query: Record<string, string | undefined>;
	body: unknown;
	set: ResponseControls;
	server?: ElysiaServer | null;
}

interface RouteRegistrar {
	route(method: string, path: string, handler: (context: ElysiaContext) => unknown): unknown;
}

function validate(schema: ZodType | undefined, value: unknown, context: ElysiaContext): { ok: true; data: unknown } | { ok: false } {
	if (!schema) return { ok: true, data: value };
	const result = schema.safeParse(value);
	if (result.success) return { ok: true, data: result.data };
	context.set.status = 400;
	return { ok: false };
}

export interface HttpServer {
	handle(request: Request): Response | Promise<Response>;
	stop(): unknown;
}

function join_prefix(base: string, pattern: string): string {
	const combined = `${base}/${pattern}`.replace(/\/+/g, "/").replace(/(.+)\/$/, "$1");
	return combined.startsWith("/") ? combined : `/${combined}`;
}

function convert(pattern: string): { path: string; catch_all: string | null } {
	let catch_all: string | null = null;
	const path = pattern
		.replace(/\[\.\.\.(\w+)\]/g, (_match, name: string) => {
			catch_all = name;
			return "*";
		})
		.replace(/\[(\w+)\]/g, ":$1");
	return { path, catch_all };
}

function client_ip(request: Request, server: ElysiaServer | null | undefined, trust_proxy: boolean): string {
	if (trust_proxy) {
		const forwarded = request.headers.get("x-forwarded-for");
		if (forwarded) return forwarded.split(",")[0].trim();
	}
	return server?.requestIP?.(request)?.address ?? "unknown";
}

function digest(value: string): Buffer {
	return createHash("sha256").update(value).digest();
}

function safe_equal(a: string, b: string): boolean {
	return timingSafeEqual(digest(a), digest(b));
}

function extract_token(request: Request, auth: AuthConfig): string | null {
	const raw = request.headers.get(auth.scheme === "bearer" ? "authorization" : auth.header);
	if (!raw) return null;
	if (auth.scheme === "bearer") {
		const match = /^Bearer\s+(.+)$/i.exec(raw);
		return match ? match[1] : null;
	}
	return raw;
}

function token_allowed(token: string, tokens: string[]): boolean {
	let allowed = false;
	for (const candidate of tokens) allowed = safe_equal(token, candidate) || allowed;
	return allowed;
}

export async function load_routes(directory: string): Promise<HttpServer | undefined> {
	if (!config.server.enabled) return undefined;

	const shards = process.env.SHARDS ? (JSON.parse(process.env.SHARDS) as number[]) : null;
	if (shards && !shards.includes(0)) return undefined;

	const app = new Elysia()
		.onError(({ code, error, set }) => {
			if (code === "NOT_FOUND") {
				set.status = 404;
				return { code: "route_not_found", message: "The requested route could not be found." };
			}
			if (code === "VALIDATION") {
				set.status = 400;
				return { code: "invalid_request", message: "The request payload is invalid." };
			}
			set.status = 500;
			console.error(`${color.fg.red}⨯${color.reset} ${tags.app} Request failed: ${error instanceof Error ? (error.stack ?? error.message) : error}`);
			const detail = error instanceof Error ? error.message : String(error);
			return { code: "internal_error", message: config.server.expose_errors ? detail : "An unexpected error occurred." };
		})
		.onRequest(({ request }) => {
			const path = new URL(request.url).pathname;
			console.log(`${tags.app} ${tags.accent(request.method)} ${path}`);
		});

	const server_config = config.server;

	if (server_config.auth.enabled && server_config.auth.tokens.length === 0) {
		console.warn(`${tags.app} ${color.fg.yellow}HTTP auth is enabled but no tokens are set${color.reset} — set ${tags.accent("API_TOKENS")} or every request will be rejected.`);
	}

	if (server_config.cors.enabled) {
		app.use(
			cors({
				origin: server_config.cors.origins.includes("*") ? true : server_config.cors.origins,
				methods: server_config.cors.methods,
				allowedHeaders: server_config.cors.headers,
				credentials: server_config.cors.credentials,
			})
		);
	}

	const auth_public = server_config.auth.public_paths.map((entry) => join_prefix(server_config.prefix, entry));
	const rate_public = server_config.rate_limit.public_paths.map((entry) => join_prefix(server_config.prefix, entry));
	const window_ms = parse_duration(server_config.rate_limit.window) ?? 60_000;

	const enforce = (instance: BaseRoute, context: ElysiaContext): unknown | null => {
		const url = new URL(context.request.url);
		const path = url.pathname;
		const ip = client_ip(context.request, context.server, server_config.trust_proxy);

		if (server_config.rules.length > 0) {
			const rule_request: RuleRequest = {
				path,
				method: context.request.method,
				ip,
				user_agent: context.request.headers.get("user-agent") ?? "",
				header: (name) => context.request.headers.get(name),
				query: (name) => url.searchParams.get(name),
			};
			const outcome = evaluate_rules(server_config.rules, rule_request);
			if (outcome) {
				context.set.status = outcome.status;
				return { code: "forbidden", message: outcome.message };
			}
		}

		const auth_enabled = instance.auth ?? server_config.auth.enabled;
		if (auth_enabled && !auth_public.includes(path)) {
			const token = extract_token(context.request, server_config.auth);
			if (token === null || !token_allowed(token, server_config.auth.tokens)) {
				context.set.status = 401;
				return { code: "unauthorized", message: "Authentication is required." };
			}
		}

		if (instance.rate_limit !== false) {
			const override = instance.rate_limit;
			const rate_enabled = override ? true : server_config.rate_limit.enabled;
			if (rate_enabled && !rate_public.includes(path)) {
				const max = override ? override.max : server_config.rate_limit.max;
				const limit_window = override ? (parse_duration(override.window) ?? window_ms) : window_ms;
				const key = server_config.rate_limit.scope === "global" ? "global" : ip;
				const result = rate_limiter.hit(`route:${path}:${key}`, max, limit_window);
				if (!result.allowed) {
					context.set.status = 429;
					context.set.headers["retry-after"] = String(Math.ceil(result.retry_after / 1000));
					return { code: "rate_limited", message: "Too many requests." };
				}
			}
		}

		return null;
	};

	app.get(join_prefix(server_config.prefix, "/health"), () => ({ status: "ok" }));

	const registrar = app as unknown as RouteRegistrar;
	let count = 0;

	for (const file of scan(directory)) {
		const feature = (await import_module(file)).default;
		if (!feature) continue;

		const registration = registration_of(feature);
		if (!registration || registration.kind !== "route") {
			console.error(`${color.fg.red}⨯${color.reset} [${color.fg.red}${relative(file)}${color.reset}] ‣ Missing ${color.fg.red}@Route${color.reset} decorator.`);
			continue;
		}

		const instance = new feature() as BaseRoute;
		instance.client = client;
		const methods = instance as unknown as Record<Verb, Handler | undefined>;

		const { path, catch_all } = convert(registration.options.pattern);
		const full_path = join_prefix(config.server.prefix, path);

		for (const verb of VERBS) {
			const impl = methods[verb];
			if (typeof impl !== "function") continue;

			const rules = instance.schema?.[verb];

			registrar.route(verb, full_path, (context) => {
				const gate = enforce(instance, context);
				if (gate !== null) return gate;

				const params: Record<string, string> = { ...context.params };
				if (catch_all && params["*"] !== undefined) params[catch_all] = params["*"];

				const checked_params = validate(rules?.params, params, context);
				if (!checked_params.ok) return { code: "invalid_request", message: "The request parameters are invalid." };

				const checked_query = validate(rules?.query, context.query, context);
				if (!checked_query.ok) return { code: "invalid_request", message: "The query string is invalid." };

				const checked_body = validate(rules?.body, context.body, context);
				if (!checked_body.ok) return { code: "invalid_request", message: "The request payload is invalid." };

				return impl.call(instance, {
					client,
					request: context.request,
					params: checked_params.data as Record<string, string>,
					query: checked_query.data as Record<string, string | undefined>,
					body: checked_body.data,
					set: context.set,
				});
			});
		}

		client.routes.set(full_path, instance);
		count++;
	}

	app.listen({ hostname: config.server.host, port: config.server.port }, () => {
		const host = config.server.host === "0.0.0.0" || config.server.host === "::" ? "localhost" : config.server.host;
		console.log(`${tags.app} Application started ➔  ${tags.accent(`http://${host}:${config.server.port}${config.server.prefix}`)}.`);
		if (count > 0) {
			console.log(`${tags.app} Loaded ${tags.accent(count)} ${count > 1 ? "routes" : "route"}.`);
		}
	});

	return app as unknown as HttpServer;
}
