import { MessageFlags } from "discord.js";
import type { Client, AutocompleteInteraction } from "discord.js";
import type { CommandData, CommandContext } from "../types";

export type SubcommandHandler = (context: CommandContext) => Promise<void>;
export type Subcommands = Record<string, SubcommandHandler>;

export function subcommand_key(group: string | null, sub: string | null): string {
	return group !== null && sub !== null ? `${group}/${sub}` : (sub ?? "");
}

export function select_subcommand(handlers: Subcommands, group: string | null, sub: string | null): SubcommandHandler | undefined {
	return handlers[subcommand_key(group, sub)] ?? (sub !== null ? handlers[sub] : undefined);
}

export abstract class BaseCommand {
	client!: Client;
	globals: Record<string, unknown> = {};
	subcommands?: Subcommands;

	abstract data: CommandData;
	abstract execute(context: CommandContext): Promise<void>;
	autocomplete?(interaction: AutocompleteInteraction): Promise<void>;

	async run_subcommands(context: CommandContext): Promise<void> {
		const options = context.interaction.options;
		const handler = select_subcommand(this.subcommands ?? {}, options.getSubcommandGroup(false), options.getSubcommand(false));
		if (handler) {
			await handler.call(this, context);
			return;
		}
		await context.interaction.reply({ content: "Unknown subcommand.", flags: MessageFlags.Ephemeral });
	}
}
