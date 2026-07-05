import { describe, expect, test } from "bun:test";
import { format_value, setting_options } from "@/helpers/panel";
import type { PanelSetting } from "@/helpers/panel";
import { tags } from "@/lib/tags";
import { config } from "config";

describe("format_value", () => {
	test("renders booleans as On/Off", () => {
		expect(format_value({ key: "a", label: "A", kind: "boolean", get: () => true, set: () => {} })).toBe("On");
		expect(format_value({ key: "a", label: "A", kind: "boolean", get: () => false, set: () => {} })).toBe("Off");
	});

	test("renders numbers and empty text", () => {
		expect(format_value({ key: "n", label: "N", kind: "number", get: () => 42, set: () => {} })).toBe("42");
		expect(format_value({ key: "t", label: "T", kind: "text", get: () => "", set: () => {} })).toBe("-");
		expect(format_value({ key: "t", label: "T", kind: "text", get: () => "hi", set: () => {} })).toBe("hi");
	});

	test("maps a choice value to its label", () => {
		const setting: PanelSetting = {
			key: "theme",
			label: "Theme",
			kind: "choice",
			choices: [
				{ label: "Dark", value: "dark" },
				{ label: "Light", value: "light" },
			],
			get: () => "dark",
			set: () => {},
		};
		expect(format_value(setting)).toBe("Dark");
	});
});

describe("setting_options", () => {
	const settings: PanelSetting[] = [
		{ key: "notifications", label: "Notifications", kind: "boolean", get: () => true, set: () => {} },
		{ key: "greeting", label: "Greeting", kind: "text", get: () => "hey", set: () => {} },
	];

	test("keys each option to its setting and shows the current value", () => {
		const options = setting_options(settings).map((option) => option.toJSON());
		expect(options).toHaveLength(2);
		expect(options[0].value).toBe("notifications");
		expect(options[0].description).toBe("On");
		expect(options[1].description).toBe("hey");
	});
});

describe("console tags", () => {
	test("reflect the configured label text and bullet", () => {
		expect(tags.app).toContain(config.console.app.text);
		expect(tags.bot).toContain(config.console.bot.text);
		expect(tags.app).toContain(config.console.bullet);
	});

	test("accent wraps a value in a truecolor escape", () => {
		const { r, g, b } = config.console.accent;
		expect(tags.accent("hi")).toBe(`\x1b[38;2;${r};${g};${b}mhi\x1b[0m`);
	});
});
