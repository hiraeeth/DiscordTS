import { describe, expect, test } from "bun:test";
import { cron_matches, validate_cron } from "@/engine/cron";

function at(hours: number, minutes: number, day = 1, month = 1): Date {
	return new Date(2026, month - 1, day, hours, minutes, 0);
}

describe("cron_matches", () => {
	test("wildcards match everything", () => {
		expect(cron_matches("* * * * *", at(12, 34))).toBe(true);
	});

	test("step values match on the interval", () => {
		expect(cron_matches("*/5 * * * *", at(0, 5))).toBe(true);
		expect(cron_matches("*/5 * * * *", at(0, 3))).toBe(false);
	});

	test("exact minute and hour", () => {
		expect(cron_matches("30 14 * * *", at(14, 30))).toBe(true);
		expect(cron_matches("30 14 * * *", at(14, 31))).toBe(false);
	});

	test("lists and ranges", () => {
		expect(cron_matches("0,15,30,45 * * * *", at(9, 15))).toBe(true);
		expect(cron_matches("0-10 * * * *", at(9, 7))).toBe(true);
		expect(cron_matches("0-10 * * * *", at(9, 20))).toBe(false);
	});

	test("day-of-week", () => {
		const monday = at(0, 0, 5);
		expect(cron_matches("0 0 * * 1", monday)).toBe(true);
		expect(cron_matches("0 0 * * 0", monday)).toBe(false);
	});

	test("rejects malformed expressions", () => {
		expect(cron_matches("* * *", at(0, 0))).toBe(false);
	});
});

describe("validate_cron", () => {
	test("accepts well-formed expressions", () => {
		expect(validate_cron("*/5 * * * *")).toBe(true);
		expect(validate_cron("0,15,30 0-12 1 1 1-5")).toBe(true);
	});

	test("rejects wrong field counts, out-of-range values, and bad steps", () => {
		expect(validate_cron("* * *")).toBe(false);
		expect(validate_cron("99 * * * *")).toBe(false);
		expect(validate_cron("* 25 * * *")).toBe(false);
		expect(validate_cron("* * * * 9")).toBe(false);
		expect(validate_cron("abc * * * *")).toBe(false);
		expect(validate_cron("*/0 * * * *")).toBe(false);
	});
});
