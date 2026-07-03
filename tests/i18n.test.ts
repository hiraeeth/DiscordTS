import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { config } from "config";
import { t, normalize_locale, reset_i18n } from "@/lib/i18n";

describe("i18n", () => {
	beforeEach(() => reset_i18n());
	afterEach(() => {
		config.localization.enabled = false;
	});

	test("resolves and interpolates the default locale", () => {
		expect(t("hello.greeting", undefined, { user: "Sam" })).toBe("Hello, Sam!");
	});

	test("normalize_locale strips the region", () => {
		expect(normalize_locale("en-US")).toBe("en");
	});

	test("returns the key when a translation is missing", () => {
		expect(t("nope.missing")).toBe("nope.missing");
	});

	test("does not interpolate inherited object properties", () => {
		expect(t("{constructor}", undefined, {})).toBe("{constructor}");
	});

	test("ignores the requested locale while disabled", () => {
		expect(t("hello.greeting", "fr", { user: "Sam" })).toBe("Hello, Sam!");
	});

	test("honours the requested locale when enabled", () => {
		config.localization.enabled = true;
		expect(t("hello.greeting", "fr", { user: "Sam" })).toBe("Bonjour, Sam !");
	});
});
