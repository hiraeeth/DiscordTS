import { describe, expect, test } from "bun:test";
import { parse_duration, format_duration } from "@/lib/duration";

describe("parse_duration", () => {
	test("parses single and compound units", () => {
		expect(parse_duration("5m")).toBe(300_000);
		expect(parse_duration("1h30m")).toBe(5_400_000);
		expect(parse_duration("500ms")).toBe(500);
		expect(parse_duration("2d")).toBe(172_800_000);
		expect(parse_duration("1w")).toBe(604_800_000);
	});

	test("treats a bare number as milliseconds and passes numbers through", () => {
		expect(parse_duration("90")).toBe(90);
		expect(parse_duration(1500)).toBe(1500);
	});

	test("returns null for invalid input", () => {
		expect(parse_duration("abc")).toBeNull();
		expect(parse_duration("5x")).toBeNull();
		expect(parse_duration("")).toBeNull();
	});

	test("rejects unparsed trailing garbage instead of silently ignoring it", () => {
		expect(parse_duration("5m3")).toBeNull();
		expect(parse_duration("1h left")).toBeNull();
	});
});

describe("format_duration", () => {
	test("breaks milliseconds into human units", () => {
		expect(format_duration(90_000)).toBe("1m 30s");
		expect(format_duration(300_000)).toBe("5m");
		expect(format_duration(500)).toBe("500ms");
		expect(format_duration(3_661_000)).toBe("1h 1m 1s");
	});

	test("limits the number of units", () => {
		expect(format_duration(3_661_000, { units: 1 })).toBe("1h");
	});
});
