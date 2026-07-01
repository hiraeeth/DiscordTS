import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import color from "@/lib/colors";
import { config } from "config";
import { client } from "../client";
import { registration_of } from "../registry";
import { scan, import_module, relative } from "./scan";
import type { ZodType } from "zod";
import type { BaseRoute, RouteContext, ResponseControls, Verb } from "../base/route";

const VERBS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

type Handler = (context: RouteContext) => unknown;

interface ElysiaContext {
	request: Request;
	params: Record<string, string>;
	query: Record<string, string | undefined>;
	body: unknown;
	set: ResponseControls;
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
			console.error(`${color.fg.red}App ${color.reset}‣ Request failed: ${error instanceof Error ? (error.stack ?? error.message) : error}`);
			return { code: "internal_error", message: "An unexpected error occurred." };
		})
		.onRequest(({ request }) => {
			const path = new URL(request.url).pathname;
			console.log(`${color.fg.cyan}App ${color.reset}‣ ${color.fg.cyan}${request.method}${color.reset} ${path}`);
		});

	if (config.server.cors) {
		app.use(cors());
	}

	app.get(join_prefix(config.server.prefix, "/health"), () => ({ status: "ok" }));

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
		console.log(`${color.fg.cyan}App ${color.reset}‣ Application started ➔  ${color.fg.cyan}http://${host}:${config.server.port}${config.server.prefix}${color.reset}.`);
		if (count > 0) {
			console.log(`${color.fg.cyan}App ${color.reset}‣ Loaded ${color.fg.cyan}${count}${color.reset} ${count > 1 ? "routes" : "route"}.`);
		}
	});

	return app as unknown as HttpServer;
}
