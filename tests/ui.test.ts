import { describe, expect, test } from "bun:test";
import { ButtonStyle, MessageFlags } from "discord.js";
import { container, text, separator, section, view, ButtonBuilder } from "@/engine/ui";

describe("Components V2 helpers", () => {
	test("container serializes to a container component with its children", () => {
		const built = container(text("hello"), separator()).toJSON() as { type: number; components: unknown[] };
		expect(built.type).toBe(17);
		expect(built.components.length).toBe(2);
	});

	test("section serializes to a section component", () => {
		const accessory = new ButtonBuilder().setCustomId("go").setLabel("Go").setStyle(ButtonStyle.Primary);
		const built = section(["line"], accessory).toJSON() as { type: number };
		expect(built.type).toBe(9);
	});

	test("view sets the components v2 flag", () => {
		const payload = view(text("x"));
		const flag = Number(MessageFlags.IsComponentsV2);
		expect(Number(payload.flags) & flag).toBe(flag);
	});
});
