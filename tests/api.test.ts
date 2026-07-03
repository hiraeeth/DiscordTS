import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { config } from "config";
import type { HttpServer } from "@/engine/loaders/routes";

let app: HttpServer | undefined;

const request = (path: string, init?: RequestInit) => app!.handle(new Request(`http://local${path}`, init));

const json = (body: unknown) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

beforeAll(async () => {
	config.server.enabled = true;
	config.server.port = 39555;
	config.server.auth.enabled = false;
	config.server.rate_limit.enabled = false;
	const { load_routes } = await import("@/engine/loaders/routes");
	app = await load_routes("./app/routes");
});

afterAll(() => {
	app?.stop();
});

describe("HTTP API", () => {
	test("exposes a health route", async () => {
		const response = await request("/api/health");
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: "ok" });
	});

	test("resolves a dynamic segment", async () => {
		const response = await request("/api/guilds/123");
		expect(response.status).toBe(200);
		expect((await response.json()).id).toBe("123");
	});

	test("resolves a catch-all segment", async () => {
		const response = await request("/api/files/a/b/c");
		expect((await response.json()).path).toBe("a/b/c");
	});

	test("accepts a valid body", async () => {
		const response = await request("/api/guilds/1", json({ content: "hi" }));
		expect(response.status).toBe(200);
		expect((await response.json()).content).toBe("hi");
	});

	test("rejects an invalid body with 400", async () => {
		const response = await request("/api/guilds/1", json({ wrong: true }));
		expect(response.status).toBe(400);
	});

	test("returns 404 for an unknown route", async () => {
		const response = await request("/api/nope");
		expect(response.status).toBe(404);
	});
});
