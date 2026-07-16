import type {
	Client,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	SlashCommandOptionsOnlyBuilder,
	SlashCommandSubcommandsOnlyBuilder,
	ContextMenuCommandBuilder,
	ContextMenuCommandInteraction,
	Message,
	User,
	GuildMember,
	GuildBasedChannel,
	Role,
} from "discord.js";
import type { Permissions } from "./permissions";
import type { PrefixCommandBuilder } from "./prefix_builder";
import type { Guard } from "./guards";
import type { CooldownScope } from "@/lib/cooldowns";

export type CommandData = SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;

export type ContextMenuData = ContextMenuCommandBuilder;

export type ComponentKind = "button" | "modal" | "select";

export interface CommandOptions {
	cooldown?: number;
	cooldown_scope?: CooldownScope;
	guilds?: string[];
	guards?: Guard[];
}

export interface ComponentOptions {
	cooldown?: number;
	cooldown_scope?: CooldownScope;
	guards?: Guard[];
}

export interface EventOptions {
	once?: boolean;
}

export interface TaskOptions {
	cron?: string;
	interval?: number;
}

export interface CommandContext {
	client: Client;
	interaction: ChatInputCommandInteraction;
	data: CommandData;
	cooldown: number;
	guilds: string[];
	globals: Record<string, unknown>;
	permissions: Permissions;
}

export interface ContextMenuContext {
	client: Client;
	interaction: ContextMenuCommandInteraction;
	data: ContextMenuData;
	cooldown: number;
	guilds: string[];
	globals: Record<string, unknown>;
	permissions: Permissions;
}

export interface PrefixOptions {
	cooldown?: number;
	cooldown_scope?: CooldownScope;
	guilds?: string[];
	guards?: Guard[];
}

export type PrefixArgKind = "string" | "integer" | "number" | "boolean" | "user" | "member" | "channel" | "role" | "rest";

export interface PrefixArg {
	name: string;
	kind: PrefixArgKind;
	description: string;
	required: boolean;
}

export type PrefixArgValue = string | number | boolean | User | GuildMember | GuildBasedChannel | Role;

export interface PrefixContext {
	client: Client;
	message: Message;
	data: PrefixCommandBuilder;
	args: Record<string, PrefixArgValue>;
	raw: string[];
	content: string;
	prefix: string;
	command: string;
	cooldown: number;
	guilds: string[];
	globals: Record<string, unknown>;
	permissions: Permissions;
}
