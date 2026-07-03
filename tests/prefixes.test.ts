import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import fs from "fs";
import os from "os";
import path from "path";
import { Collection, PermissionsBitField, PermissionFlagsBits } from "discord.js";
import type { Message, GuildMember } from "discord.js";
import { tokenize, split_first, resolve_arguments } from "@/engine/prefix_args";
import { PrefixCommandBuilder } from "@/engine/prefix_builder";
import { is_valid_prefix } from "@/lib/prefixes";
import { lookup, resolve_member_permissions } from "@/engine/prefix_dispatch";
import type { RegisteredPrefix } from "@/engine/client";
import type { PrefixArg } from "@/engine/types";

const message = {} as unknown as Message;

describe("tokenize", () => {
	test("splits on whitespace", () => {
		expect(tokenize("set new value")).toEqual(["set", "new", "value"]);
	});

	test("keeps quoted segments together", () => {
		expect(tokenize('say "hello world" now')).toEqual(["say", "hello world", "now"]);
	});

	test("returns empty for blank input", () => {
		expect(tokenize("   ")).toEqual([]);
	});
});

describe("split_first", () => {
	test("separates the leading token from the remainder", () => {
		expect(split_first("echo hello world")).toEqual({ first: "echo", rest: "hello world" });
	});

	test("computes the remainder past a quoted leading token", () => {
		expect(split_first('"echo" hello world')).toEqual({ first: "echo", rest: "hello world" });
	});

	test("returns empty parts for blank input", () => {
		expect(split_first("   ")).toEqual({ first: "", rest: "" });
	});
});

describe("is_valid_prefix", () => {
	test("accepts short prefixes without whitespace", () => {
		expect(is_valid_prefix("!")).toBe(true);
		expect(is_valid_prefix("??")).toBe(true);
	});

	test("rejects empty, overlong, or whitespace prefixes", () => {
		expect(is_valid_prefix("")).toBe(false);
		expect(is_valid_prefix("123456789")).toBe(false);
		expect(is_valid_prefix("a b")).toBe(false);
	});
});

describe("resolve_arguments", () => {
	const definitions: PrefixArg[] = [
		{ name: "count", kind: "integer", description: "", required: true },
		{ name: "note", kind: "rest", description: "", required: false },
	];

	test("resolves primitives and a trailing rest", async () => {
		const result = await resolve_arguments(message, definitions, ["3", "a", "b"]);
		expect(result).toEqual({ ok: true, values: { count: 3, note: "a b" } });
	});

	test("fails when a required argument is missing", async () => {
		const result = await resolve_arguments(message, definitions, []);
		expect(result.ok).toBe(false);
	});

	test("fails when a required argument is invalid", async () => {
		const result = await resolve_arguments(message, definitions, ["nope"]);
		expect(result.ok).toBe(false);
	});

	test("parses booleans", async () => {
		const flags: PrefixArg[] = [{ name: "enabled", kind: "boolean", description: "", required: true }];
		expect(await resolve_arguments(message, flags, ["yes"])).toEqual({ ok: true, values: { enabled: true } });
		expect(await resolve_arguments(message, flags, ["off"])).toEqual({ ok: true, values: { enabled: false } });
	});
});

describe("PrefixCommandBuilder", () => {
	test("lowercases the name and renders usage", () => {
		const builder = new PrefixCommandBuilder().set_name("Config").add_string("key", "", true).add_string("value", "");
		expect(builder.name).toBe("config");
		expect(builder.usage(".")).toBe(".config <key> [value]");
	});
});

describe("lookup", () => {
	const command = { data: new PrefixCommandBuilder().set_name("ping").add_alias("p", "pong") } as RegisteredPrefix;
	const prefixes = new Collection<string, RegisteredPrefix>([[command.data.name, command]]);

	test("resolves a command by its canonical name and by every alias to the same entry", () => {
		expect(lookup(prefixes, "ping")).toBe(command);
		expect(lookup(prefixes, "p")).toBe(command);
		expect(lookup(prefixes, "pong")).toBe(command);
	});

	test("returns undefined for an unknown name", () => {
		expect(lookup(prefixes, "nope")).toBeUndefined();
	});
});

describe("resolve_member_permissions", () => {
	const member = { permissions: new PermissionsBitField(PermissionFlagsBits.ManageMessages) } as GuildMember;

	test("uses channel-resolved permissions, not the guild base", () => {
		const channel_bits = new PermissionsBitField(PermissionFlagsBits.SendMessages);
		const message = {
			inGuild: () => true,
			member,
			channel: { permissionsFor: () => channel_bits },
		} as unknown as Message;

		const resolved = resolve_member_permissions(message);
		expect(resolved.has("SendMessages")).toBe(true);
		expect(resolved.has("ManageMessages")).toBe(false);
	});

	test("grants nothing for a message without a member (DM)", () => {
		const message = { inGuild: () => false, member: null } as unknown as Message;
		expect(resolve_member_permissions(message).has("ManageMessages")).toBe(false);
	});
});

describe("prefix store", () => {
	const dir = path.join(os.tmpdir(), `prefixes_test_${process.pid}`);
	const file = path.join(dir, "prefixes.json");

	beforeEach(async () => {
		process.env.DATA_DIR = dir;
		if (fs.existsSync(file)) fs.rmSync(file);
		const store = await import("@/lib/prefixes");
		store.reset_cache();
	});

	afterAll(() => {
		if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
		delete process.env.DATA_DIR;
	});

	test("falls back to the config default", async () => {
		const { get_prefix } = await import("@/lib/prefixes");
		expect(get_prefix("123")).toBe(".");
	});

	test("persists a per-guild override and clears it", async () => {
		const { get_prefix, set_prefix, clear_prefix } = await import("@/lib/prefixes");
		set_prefix("123", "!");
		expect(get_prefix("123")).toBe("!");
		expect(get_prefix("456")).toBe(".");
		clear_prefix("123");
		expect(get_prefix("123")).toBe(".");
	});
});
