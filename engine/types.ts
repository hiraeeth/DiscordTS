import type { Client, ChatInputCommandInteraction, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder } from "discord.js";
import type { Permissions } from "./permissions";

export type CommandData = SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;

export type ComponentKind = "button" | "modal" | "select";

export interface CommandOptions {
	cooldown?: number;
	guilds?: string[];
}

export interface EventOptions {
	once?: boolean;
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
