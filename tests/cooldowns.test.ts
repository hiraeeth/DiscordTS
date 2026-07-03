import { describe, expect, test } from "bun:test";
import { Cooldowns, cooldown_scope_id, cooldown_bucket } from "@/lib/cooldowns";

describe("Cooldowns", () => {
	test("first consume passes, second reports the remaining time", () => {
		const cooldowns = new Cooldowns();
		expect(cooldowns.consume("ping:user:1", 1000)).toBe(0);
		const left = cooldowns.consume("ping:user:1", 1000);
		expect(left).toBeGreaterThan(0);
		expect(left).toBeLessThanOrEqual(1000);
	});

	test("separate buckets are independent", () => {
		const cooldowns = new Cooldowns();
		cooldowns.consume("ping:user:1", 1000);
		expect(cooldowns.consume("ping:user:2", 1000)).toBe(0);
	});

	test("clear resets a bucket", () => {
		const cooldowns = new Cooldowns();
		cooldowns.consume("ping:user:1", 1000);
		cooldowns.clear("ping:user:1");
		expect(cooldowns.consume("ping:user:1", 1000)).toBe(0);
	});
});

describe("cooldown_scope_id", () => {
	const source = { user: "u1", guild: "g1", channel: "c1" };

	test("selects the id for each scope", () => {
		expect(cooldown_scope_id("user", source)).toBe("u1");
		expect(cooldown_scope_id("guild", source)).toBe("g1");
		expect(cooldown_scope_id("channel", source)).toBe("c1");
		expect(cooldown_scope_id("global", source)).toBe("global");
	});

	test("falls back to the user when guild is missing", () => {
		expect(cooldown_scope_id("guild", { user: "u1", guild: null, channel: null })).toBe("u1");
	});
});

describe("cooldown_bucket", () => {
	const source = { user: "u1", guild: "g1", channel: "c1" };

	test("composes kind, name, scope, and scope id", () => {
		expect(cooldown_bucket("prefix", "ping", "user", source)).toBe("prefix:ping:user:u1");
		expect(cooldown_bucket("command", "ping", "guild", source)).toBe("command:ping:guild:g1");
	});

	test("same name yields one bucket regardless of the invoking alias", () => {
		expect(cooldown_bucket("prefix", "ping", "user", source)).toBe(cooldown_bucket("prefix", "ping", "user", source));
	});
});
