import type { Message } from "discord.js";
import type { PrefixArg, PrefixArgValue } from "./types";

export type ResolveResult = { ok: true; values: Record<string, PrefixArgValue> } | { ok: false; argument: PrefixArg; reason: string };

const TOKEN_PATTERN = /"([^"]*)"|'([^']*)'|(\S+)/g;

export function tokenize(content: string): string[] {
	const tokens: string[] = [];
	for (const match of content.matchAll(TOKEN_PATTERN)) {
		tokens.push(match[1] ?? match[2] ?? match[3] ?? "");
	}
	return tokens;
}

export function split_first(content: string): { first: string; rest: string } {
	const pattern = new RegExp(TOKEN_PATTERN.source, "");
	const match = pattern.exec(content);
	if (!match) return { first: "", rest: "" };
	const first = match[1] ?? match[2] ?? match[3] ?? "";
	const rest = content.slice(match.index + match[0].length).trimStart();
	return { first, rest };
}

function extract_id(token: string): string {
	const match = token.match(/^<(?:@[!&]?|#)(\d+)>$/);
	if (match) return match[1];
	return token.replace(/\D/g, "");
}

function parse_boolean(token: string): boolean | null {
	const normalized = token.toLowerCase();
	if (["true", "yes", "y", "1", "on"].includes(normalized)) return true;
	if (["false", "no", "n", "0", "off"].includes(normalized)) return false;
	return null;
}

async function resolve_one(message: Message, argument: PrefixArg, token: string, rest: string[]): Promise<PrefixArgValue | null> {
	switch (argument.kind) {
		case "string":
			return token;
		case "rest":
			return rest.join(" ");
		case "integer": {
			if (!/^-?\d+$/.test(token)) return null;
			return Number.parseInt(token, 10);
		}
		case "number": {
			const value = Number.parseFloat(token);
			return Number.isNaN(value) ? null : value;
		}
		case "boolean":
			return parse_boolean(token);
		case "user": {
			const id = extract_id(token);
			const mentioned = message.mentions.users.get(id);
			if (mentioned) return mentioned;
			return await message.client.users.fetch(id).catch(() => null);
		}
		case "member": {
			const guild = message.guild;
			if (!guild) return null;
			const id = extract_id(token);
			const mentioned = message.mentions.members?.get(id);
			if (mentioned) return mentioned;
			return await guild.members.fetch(id).catch(() => null);
		}
		case "channel": {
			const guild = message.guild;
			if (!guild) return null;
			const id = extract_id(token);
			return guild.channels.cache.get(id) ?? null;
		}
		case "role": {
			const guild = message.guild;
			if (!guild) return null;
			const id = extract_id(token);
			return message.mentions.roles.get(id) ?? guild.roles.cache.get(id) ?? null;
		}
		default:
			return null;
	}
}

export async function resolve_arguments(message: Message, definitions: PrefixArg[], tokens: string[]): Promise<ResolveResult> {
	const values: Record<string, PrefixArgValue> = {};

	for (let i = 0; i < definitions.length; i++) {
		const argument = definitions[i];
		const rest = tokens.slice(i);
		const token = tokens[i];

		if (token === undefined && argument.kind !== "rest") {
			if (argument.required) return { ok: false, argument, reason: "missing" };
			continue;
		}

		if (argument.kind === "rest" && rest.length === 0) {
			if (argument.required) return { ok: false, argument, reason: "missing" };
			continue;
		}

		const resolved = await resolve_one(message, argument, token ?? "", rest);
		if (resolved === null) {
			if (argument.required) return { ok: false, argument, reason: "invalid" };
			continue;
		}

		values[argument.name] = resolved;
		if (argument.kind === "rest") break;
	}

	return { ok: true, values };
}
