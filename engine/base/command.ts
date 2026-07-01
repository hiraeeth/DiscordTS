import type { Client } from "discord.js";
import type { CommandData, CommandContext } from "../types";

export abstract class BaseCommand {
	client!: Client;
	globals: Record<string, unknown> = {};

	abstract data: CommandData;
	abstract execute(context: CommandContext): Promise<void>;
}
