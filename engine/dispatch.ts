import {
	Events,
	MessageFlags,
	ChatInputCommandInteraction,
	ContextMenuCommandInteraction,
	CommandInteraction,
	AutocompleteInteraction,
	RepliableInteraction,
	InteractionReplyOptions,
} from "discord.js";
import color from "@/lib/colors";
import { cooldowns, cooldown_bucket } from "@/lib/cooldowns";
import { format_duration } from "@/lib/duration";
import { client } from "./client";
import { Permissions } from "./permissions";
import { run_guards } from "./guards";
import type { GuardContext } from "./guards";
import type { ComponentKind } from "./types";

const COMPONENT_ID_SEPARATOR = ":";

async function respond_error(interaction: RepliableInteraction | CommandInteraction, message: string): Promise<void> {
	const payload: InteractionReplyOptions = { content: message, flags: MessageFlags.Ephemeral };
	if (interaction.replied || interaction.deferred) {
		await interaction.followUp(payload);
	} else {
		await interaction.reply(payload);
	}
}

function guard_context(interaction: CommandInteraction | RepliableInteraction | AutocompleteInteraction, permissions: Permissions, kind: GuardContext["kind"]): GuardContext {
	return {
		client,
		kind,
		user: interaction.user,
		member: interaction.guild?.members.cache.get(interaction.user.id) ?? null,
		guild: interaction.guild,
		channel: interaction.channel,
		permissions,
		bot_permissions: new Permissions(interaction.appPermissions),
	};
}

async function run_command(interaction: ChatInputCommandInteraction): Promise<void> {
	const command = client.commands.get(interaction.commandName);
	if (!command) return;

	const permissions = new Permissions(interaction.memberPermissions);
	const denial = await run_guards(command.guards, guard_context(interaction, permissions, "command"));
	if (denial !== null) {
		await interaction.reply({ content: denial, flags: MessageFlags.Ephemeral });
		return;
	}

	const scope = command.cooldown_scope ?? "user";
	if (command.cooldown > 0) {
		const bucket = cooldown_bucket("command", interaction.commandName, scope, { user: interaction.user.id, guild: interaction.guildId, channel: interaction.channelId });
		const left = cooldowns.consume(bucket, command.cooldown * 1000);
		if (left > 0) {
			await interaction.reply({ content: `This command is on cooldown. Try again in ${format_duration(left)}.`, flags: MessageFlags.Ephemeral });
			return;
		}
	}

	try {
		await command.instance.execute({
			client,
			interaction,
			data: command.data,
			cooldown: command.cooldown,
			guilds: command.guilds,
			globals: command.globals,
			permissions,
		});
	} catch (error) {
		console.error(`${color.fg.red}⨯${color.reset} Command [${color.fg.red}${interaction.commandName}${color.reset}] failed: ${error}`);
		await respond_error(interaction, "Command failed to be executed.");
	}
}

async function run_context(interaction: ContextMenuCommandInteraction): Promise<void> {
	const command = client.context.get(interaction.commandName);
	if (!command) return;

	const permissions = new Permissions(interaction.memberPermissions);
	const denial = await run_guards(command.guards, guard_context(interaction, permissions, "command"));
	if (denial !== null) {
		await interaction.reply({ content: denial, flags: MessageFlags.Ephemeral });
		return;
	}

	const scope = command.cooldown_scope ?? "user";
	if (command.cooldown > 0) {
		const bucket = cooldown_bucket("context", interaction.commandName, scope, { user: interaction.user.id, guild: interaction.guildId, channel: interaction.channelId });
		const left = cooldowns.consume(bucket, command.cooldown * 1000);
		if (left > 0) {
			await interaction.reply({ content: `This command is on cooldown. Try again in ${format_duration(left)}.`, flags: MessageFlags.Ephemeral });
			return;
		}
	}

	try {
		await command.instance.execute({
			client,
			interaction,
			data: command.data,
			cooldown: command.cooldown,
			guilds: command.guilds,
			globals: command.globals,
			permissions,
		});
	} catch (error) {
		console.error(`${color.fg.red}⨯${color.reset} Context menu [${color.fg.red}${interaction.commandName}${color.reset}] failed: ${error}`);
		await respond_error(interaction, "Command failed to be executed.");
	}
}

export async function run_autocomplete(interaction: AutocompleteInteraction): Promise<void> {
	const command = client.commands.get(interaction.commandName);
	if (!command || typeof command.instance.autocomplete !== "function") return;

	const permissions = new Permissions(interaction.memberPermissions);
	const denial = await run_guards(command.guards, guard_context(interaction, permissions, "command"));
	if (denial !== null) {
		await interaction.respond([]).catch(() => undefined);
		return;
	}

	try {
		await command.instance.autocomplete(interaction);
	} catch (error) {
		console.error(`${color.fg.red}⨯${color.reset} Autocomplete [${color.fg.red}${interaction.commandName}${color.reset}] failed: ${error}`);
	}
}

export function component_id(custom_id: string): string {
	return custom_id.split(COMPONENT_ID_SEPARATOR)[0];
}

export async function run_component(kind: ComponentKind, interaction: RepliableInteraction & { customId: string }): Promise<void> {
	const id = component_id(interaction.customId);
	const component = client.components.get(`${kind}_${id}`);
	if (!component) return;

	const permissions = new Permissions(interaction.memberPermissions);
	const denial = await run_guards(component.guards, guard_context(interaction, permissions, "component"));
	if (denial !== null) {
		await respond_error(interaction, denial);
		return;
	}

	const scope = component.cooldown_scope ?? "user";
	if (component.cooldown > 0) {
		const bucket = cooldown_bucket("component", id, scope, { user: interaction.user.id, guild: interaction.guildId, channel: interaction.channelId });
		const left = cooldowns.consume(bucket, component.cooldown * 1000);
		if (left > 0) {
			await respond_error(interaction, `This is on cooldown. Try again in ${format_duration(left)}.`);
			return;
		}
	}

	try {
		await component.instance.execute(interaction);
	} catch (error) {
		console.error(`${color.fg.red}⨯${color.reset} Component [${color.fg.red}${kind}_${id}${color.reset}] failed: ${error}`);
		await respond_error(interaction, "This interaction failed to be processed.");
	}
}

export function bind_dispatch(): void {
	client.on(Events.InteractionCreate, async (interaction) => {
		if (interaction.isChatInputCommand()) return run_command(interaction);
		if (interaction.isContextMenuCommand()) return run_context(interaction);
		if (interaction.isAutocomplete()) return run_autocomplete(interaction);
		if (interaction.isButton()) return run_component("button", interaction);
		if (interaction.isModalSubmit()) return run_component("modal", interaction);
		if (interaction.isAnySelectMenu()) return run_component("select", interaction);
	});
}
