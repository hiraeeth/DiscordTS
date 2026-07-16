import { Collection, Events, Message } from "discord.js";
import color from "@/lib/colors";
import { config } from "config";
import { get_prefix } from "@/lib/prefixes";
import { cooldowns, cooldown_bucket } from "@/lib/cooldowns";
import { format_duration } from "@/lib/duration";
import { client } from "./client";
import { Permissions } from "./permissions";
import { run_guards } from "./guards";
import type { GuardContext } from "./guards";
import { tokenize, split_first, resolve_arguments } from "./prefix_args";
import type { RegisteredPrefix } from "./client";

function match_prefix(message: Message): { prefix: string; rest: string } | null {
	const content = message.content;
	const guild_prefix = get_prefix(message.guildId);
	if (guild_prefix.length > 0 && content.startsWith(guild_prefix)) {
		return { prefix: guild_prefix, rest: content.slice(guild_prefix.length) };
	}

	if (config.prefix.allow_mention && client.user) {
		for (const mention of [`<@${client.user.id}>`, `<@!${client.user.id}>`]) {
			if (content.startsWith(mention)) return { prefix: mention, rest: content.slice(mention.length) };
		}
	}

	return null;
}

export function lookup(prefixes: Collection<string, RegisteredPrefix>, name: string): RegisteredPrefix | undefined {
	return prefixes.get(name) ?? prefixes.find((command) => command.data.aliases.includes(name));
}

function is_allowed_here(command: RegisteredPrefix, message: Message): boolean {
	if (command.guilds.includes("*")) return true;
	return message.guildId !== null && command.guilds.includes(message.guildId);
}

export function resolve_member_permissions(message: Message): Permissions {
	if (message.inGuild() && message.member) return new Permissions(message.channel.permissionsFor(message.member));
	return new Permissions(message.member);
}

export function resolve_bot_permissions(message: Message): Permissions {
	const me = message.guild?.members.me ?? null;
	if (message.inGuild() && me) return new Permissions(message.channel.permissionsFor(me));
	return new Permissions(me);
}

function guard_context(message: Message, permissions: Permissions): GuardContext {
	return {
		client,
		kind: "prefix",
		user: message.author,
		member: message.member,
		guild: message.guild,
		channel: message.channel,
		permissions,
		bot_permissions: resolve_bot_permissions(message),
	};
}

async function run(message: Message): Promise<void> {
	if (message.author.bot || message.content.length === 0) return;

	const matched = match_prefix(message);
	if (!matched) return;

	const tokens = tokenize(matched.rest.trim());
	if (tokens.length === 0) return;

	const name = tokens[0].toLowerCase();
	const command = lookup(client.prefixes, name);
	if (!command || !is_allowed_here(command, message)) return;

	const permissions = resolve_member_permissions(message);
	const denial = await run_guards(command.guards, guard_context(message, permissions));
	if (denial !== null) {
		await message.reply(denial).catch(() => undefined);
		return;
	}

	const scope = command.cooldown_scope ?? "user";
	if (command.cooldown > 0) {
		const bucket = cooldown_bucket("prefix", command.data.name, scope, { user: message.author.id, guild: message.guildId, channel: message.channelId });
		const left = cooldowns.consume(bucket, command.cooldown * 1000);
		if (left > 0) {
			await message.reply(`This command is on cooldown. Try again in ${format_duration(left)}.`).catch(() => undefined);
			return;
		}
	}

	const raw = tokens.slice(1);
	const content = split_first(matched.rest.trim()).rest;

	let values = {};
	if (command.data.args.length > 0) {
		const resolved = await resolve_arguments(message, command.data.args, raw);
		if (!resolved.ok) {
			await message.reply(`Usage: \`${command.data.usage(matched.prefix)}\``).catch(() => undefined);
			return;
		}
		values = resolved.values;
	}

	try {
		await command.instance.execute({
			client,
			message,
			data: command.data,
			args: values,
			raw,
			content,
			prefix: matched.prefix,
			command: name,
			cooldown: command.cooldown,
			guilds: command.guilds,
			globals: command.globals,
			permissions,
		});
	} catch (error) {
		console.error(`${color.fg.red}⨯${color.reset} Prefix command [${color.fg.red}${name}${color.reset}] failed: ${error}`);
		await message.reply("Command failed to be executed.").catch(() => undefined);
	}
}

export function bind_prefix_dispatch(): void {
	client.on(Events.MessageCreate, (message) => void run(message));
}
