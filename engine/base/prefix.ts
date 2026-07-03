import type { Client } from "discord.js";
import type { PrefixContext } from "../types";
import type { PrefixCommandBuilder } from "../prefix_builder";

export abstract class BasePrefixCommand {
	client!: Client;
	globals: Record<string, unknown> = {};

	abstract data: PrefixCommandBuilder;
	abstract execute(context: PrefixContext): Promise<void>;
}
