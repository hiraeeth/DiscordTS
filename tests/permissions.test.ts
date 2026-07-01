import { describe, expect, test } from "bun:test";
import { PermissionsBitField, PermissionFlagsBits } from "discord.js";
import { Permissions } from "@/engine/permissions";

const bits = new PermissionsBitField(PermissionFlagsBits.ManageGuild);

describe("Permissions", () => {
	test("reports a granted permission", () => {
		expect(new Permissions(bits).has("ManageGuild")).toBe(true);
	});

	test("reports a missing permission", () => {
		expect(new Permissions(bits).has("Administrator")).toBe(false);
	});

	test("any matches when at least one is present", () => {
		expect(new Permissions(bits).any(["Administrator", "ManageGuild"])).toBe(true);
	});

	test("all requires every permission", () => {
		expect(new Permissions(bits).all(["Administrator", "ManageGuild"])).toBe(false);
	});

	test("missing lists absent permissions", () => {
		expect(new Permissions(bits).missing(["Administrator", "ManageGuild"])).toEqual(["Administrator"]);
	});

	test("a null holder denies everything", () => {
		expect(new Permissions(null).has("ManageGuild")).toBe(false);
	});
});
