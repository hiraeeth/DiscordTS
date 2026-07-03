import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { config } from "config";
import { rate_limiter } from "@/lib/ratelimit";
import type { HttpServer } from "@/engine/loaders/routes";

let app: HttpServer | undefined;

const request = (path: string, init?: RequestInit) => app!.handle(new Request(`http://local${path}`, init));
const bearer = (token: string) => ({ headers: { authorization: `Bearer ${token}` } });

beforeAll(async () => {
	config.server.enabled = true;
	config.server.port = 39557;
	config.server.trust_proxy = false;
	config.server.expose_errors = false;
	config.server.cors = { enabled: true, origins: ["https://allowed.example"], methods: ["GET", "POST", "OPTIONS"], headers: ["content-type", "authorization"], credentials: false };
	config.server.auth = { enabled: true, scheme: "bearer", header: "authorization", tokens: ["s3cret"], public_paths: ["/health"] };
	config.server.rate_limit = { enabled: true, window: "1m", max: 1000, scope: "ip", public_paths: [] };
	config.server.rules = [{ name: "blocklist", conditions: [{ field: "path", operator: "starts_with", value: "/api/guilds/999" }], action: "deny", status: 403, message: "Blocked." }];

	const { load_routes } = await import("@/engine/loaders/routes");
	app = await load_routes("./app/routes");
});

afterAll(() => {
	app?.stop();
	rate_limiter.clear();
});

describe("HTTP security", () => {
	test("health is reachable without a token", async () => {
		const response = await request("/api/health");
		expect(response.status).toBe(200);
	});

	test("a protected route rejects a missing token with 401", async () => {
		const response = await request("/api/guilds/123");
		expect(response.status).toBe(401);
	});

	test("a protected route rejects a wrong token with 401", async () => {
		const response = await request("/api/guilds/123", bearer("nope"));
		expect(response.status).toBe(401);
	});

	test("a protected route accepts a valid bearer token", async () => {
		const response = await request("/api/guilds/123", bearer("s3cret"));
		expect(response.status).toBe(200);
	});

	test("a deny rule short-circuits before the handler", async () => {
		const response = await request("/api/guilds/999", bearer("s3cret"));
		expect(response.status).toBe(403);
		expect((await response.json()).message).toBe("Blocked.");
	});

	test("a per-route auth override exempts a route", async () => {
		const { client } = await import("@/engine/client");
		const route = client.routes.get("/api/files/*") as { auth?: boolean };
		route.auth = false;
		try {
			const response = await request("/api/files/x/y");
			expect(response.status).toBe(200);
		} finally {
			route.auth = undefined;
		}
	});

	test("exceeding the rate limit returns 429 with a Retry-After header", async () => {
		rate_limiter.clear();
		config.server.rate_limit.max = 1;

		const first = await request("/api/guilds/123", bearer("s3cret"));
		expect(first.status).toBe(200);

		const second = await request("/api/guilds/123", bearer("s3cret"));
		expect(second.status).toBe(429);
		expect(Number(second.headers.get("retry-after"))).toBeGreaterThan(0);

		config.server.rate_limit.max = 1000;
	});

	test("reflects an allowed CORS origin", async () => {
		const response = await request("/api/health", { headers: { origin: "https://allowed.example" } });
		expect(response.headers.get("access-control-allow-origin")).toBe("https://allowed.example");
	});
});
