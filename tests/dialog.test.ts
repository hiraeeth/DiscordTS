import { describe, expect, test } from "bun:test";
import { ButtonStyle } from "discord.js";
import { dialog_row } from "@/helpers/dialog";

interface ButtonJson {
	custom_id: string;
	label: string;
	style: number;
	disabled: boolean;
}

const buttons = [
	{ id: "confirm", label: "Delete", style: "danger" as const },
	{ id: "cancel", label: "Keep" },
];

function components(disabled = false): ButtonJson[] {
	return dialog_row(buttons, disabled).toJSON().components as ButtonJson[];
}

describe("dialog_row", () => {
	test("prefixes custom ids and maps styles", () => {
		const parts = components();
		expect(parts).toHaveLength(2);
		expect(parts[0].custom_id).toBe("dialog_confirm");
		expect(parts[0].label).toBe("Delete");
		expect(parts[0].style).toBe(ButtonStyle.Danger);
		expect(parts[0].disabled).toBe(false);
	});

	test("defaults an unstyled button to primary", () => {
		expect(components()[1].style).toBe(ButtonStyle.Primary);
	});

	test("disables every button when requested", () => {
		for (const part of components(true)) expect(part.disabled).toBe(true);
	});
});
