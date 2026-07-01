import { Client, Collection } from "discord.js";
import { config } from "config";
import type { BaseCommand } from "./base/command";
import type { Component as BaseComponent } from "./base/component";
import type { CommandData } from "./types";

export interface RegisteredCommand {
	instance: BaseCommand;
	data: CommandData;
	cooldown: number;
	guilds: string[];
	globals: Record<string, unknown>;
	used: Date;
}

export const client = new Client({
	intents: config.bot.intents,
	presence: config.bot.presence,
});

client.commands = new Collection();
client.components = new Collection();
client.routes = new Collection();

declare module "discord.js" {
	interface Client {
		commands: Collection<string, RegisteredCommand>;
		components: Collection<string, BaseComponent>;
		routes: Collection<string, unknown>;
	}
}
