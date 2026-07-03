import { describe, expect, test } from "bun:test";
import { coerce_field } from "@/helpers/form";
import type { FormField } from "@/helpers/form";

const number_field: FormField = { key: "rating", label: "Rating", kind: "number", required: true, min: 1, max: 5 };

describe("coerce_field", () => {
	test("returns trimmed text as-is", () => {
		expect(coerce_field({ key: "name", label: "Name" }, "  hi  ")).toEqual({ ok: true, value: "hi" });
	});

	test("parses valid numbers", () => {
		expect(coerce_field(number_field, "4")).toEqual({ ok: true, value: 4 });
	});

	test("rejects non-numbers and out-of-range values", () => {
		expect(coerce_field(number_field, "abc").ok).toBe(false);
		expect(coerce_field(number_field, "0").ok).toBe(false);
		expect(coerce_field(number_field, "9").ok).toBe(false);
	});

	test("treats an empty optional number as unset", () => {
		expect(coerce_field({ key: "age", label: "Age", kind: "number" }, "")).toEqual({ ok: true, value: undefined });
	});
});
