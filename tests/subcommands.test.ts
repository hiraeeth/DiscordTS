import { describe, expect, test } from "bun:test";
import { subcommand_key, select_subcommand } from "@/engine/base/command";
import type { Subcommands } from "@/engine/base/command";

const noop = async () => {};
const handlers: Subcommands = {
	status: noop,
	"admin/reload": noop,
};

describe("subcommand_key", () => {
	test("joins a group and subcommand", () => {
		expect(subcommand_key("admin", "reload")).toBe("admin/reload");
	});

	test("uses the subcommand alone when there is no group", () => {
		expect(subcommand_key(null, "status")).toBe("status");
	});
});

describe("select_subcommand", () => {
	test("finds a grouped handler", () => {
		expect(select_subcommand(handlers, "admin", "reload")).toBe(handlers["admin/reload"]);
	});

	test("finds a bare subcommand handler", () => {
		expect(select_subcommand(handlers, null, "status")).toBe(handlers.status);
	});

	test("returns undefined for an unknown subcommand", () => {
		expect(select_subcommand(handlers, null, "missing")).toBeUndefined();
	});
});
