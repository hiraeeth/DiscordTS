import { Client, Collection } from "discord.js";
import { config } from "config";
import type { BaseCommand } from "./base/command";
import type { BasePrefixCommand } from "./base/prefix";
import type { BaseContextMenu } from "./base/context";
import type { Component as BaseComponent } from "./base/component";
import type { CommandData, ContextMenuData } from "./types";
import type { PrefixCommandBuilder } from "./prefix_builder";
import type { Guard } from "./guards";
import type { CooldownScope } from "@/lib/cooldowns";

export interface RegisteredCommand {
	instance: BaseCommand;
	data: CommandData;
	cooldown: number;
	cooldown_scope?: CooldownScope;
	guilds: string[];
	guards?: Guard[];
	globals: Record<string, unknown>;
}

export interface RegisteredPrefix {
	instance: BasePrefixCommand;
	data: PrefixCommandBuilder;
	cooldown: number;
	cooldown_scope?: CooldownScope;
	guilds: string[];
	guards?: Guard[];
	globals: Record<string, unknown>;
}

export interface RegisteredContext {
	instance: BaseContextMenu;
	data: ContextMenuData;
	cooldown: number;
	cooldown_scope?: CooldownScope;
	guilds: string[];
	guards?: Guard[];
	globals: Record<string, unknown>;
}

export interface RegisteredComponent {
	instance: BaseComponent;
	cooldown: number;
	cooldown_scope?: CooldownScope;
	guards?: Guard[];
}

export const client = new Client({
	intents: config.bot.intents,
	presence: config.bot.presence,
});

client.commands = new Collection();
client.prefixes = new Collection();
client.context = new Collection();
client.components = new Collection();
client.routes = new Collection();

declare module "discord.js" {
	interface Client {
		commands: Collection<string, RegisteredCommand>;
		prefixes: Collection<string, RegisteredPrefix>;
		context: Collection<string, RegisteredContext>;
		components: Collection<string, RegisteredComponent>;
		routes: Collection<string, unknown>;
	}
}
