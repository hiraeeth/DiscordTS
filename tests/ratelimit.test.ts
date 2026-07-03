import { describe, expect, test } from "bun:test";
import { RateLimiter } from "@/lib/ratelimit";

describe("RateLimiter", () => {
	test("allows up to max hits then blocks", () => {
		const limiter = new RateLimiter();
		expect(limiter.hit("k", 2, 10_000).allowed).toBe(true);
		expect(limiter.hit("k", 2, 10_000).allowed).toBe(true);
		const blocked = limiter.hit("k", 2, 10_000);
		expect(blocked.allowed).toBe(false);
		expect(blocked.retry_after).toBeGreaterThan(0);
		expect(blocked.retry_after).toBeLessThanOrEqual(10_000);
	});

	test("keys are independent", () => {
		const limiter = new RateLimiter();
		limiter.hit("a", 1, 10_000);
		expect(limiter.hit("a", 1, 10_000).allowed).toBe(false);
		expect(limiter.hit("b", 1, 10_000).allowed).toBe(true);
	});

	test("a fresh window reopens after expiry", () => {
		const limiter = new RateLimiter();
		expect(limiter.hit("k", 1, 0).allowed).toBe(true);
		expect(limiter.hit("k", 1, 0).allowed).toBe(true);
	});

	test("clear resets a key", () => {
		const limiter = new RateLimiter();
		limiter.hit("k", 1, 10_000);
		limiter.clear("k");
		expect(limiter.hit("k", 1, 10_000).allowed).toBe(true);
	});
});
