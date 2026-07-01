import { Events, MessageFlags, ChatInputCommandInteraction, RepliableInteraction, InteractionReplyOptions } from "discord.js";
import color from "@/lib/colors";
import { client } from "./client";
import { Permissions } from "./permissions";
import type { ComponentKind } from "./types";

async function respond_error(interaction: RepliableInteraction, message: string): Promise<void> {
	const payload: InteractionReplyOptions = { content: message, flags: MessageFlags.Ephemeral };
	if (interaction.replied || interaction.deferred) {
		await interaction.followUp(payload);
	} else {
		await interaction.reply(payload);
	}
}

async function run_command(interaction: ChatInputCommandInteraction): Promise<void> {
	const command = client.commands.get(interaction.commandName);
	if (!command) return;

	const now = Date.now();
	if (command.cooldown > 0 && command.used.getTime() + command.cooldown * 1000 > now) {
		await interaction.reply({ content: "This command is on cooldown and cannot be used yet.", flags: MessageFlags.Ephemeral });
		return;
	}

	try {
		await command.instance.execute({
			client,
			interaction,
			data: command.data,
			cooldown: command.cooldown,
			guilds: command.guilds,
			globals: command.globals,
			permissions: new Permissions(interaction.memberPermissions),
		});
		command.used = new Date();
	} catch (error) {
		console.error(`${color.fg.red}⨯${color.reset} Command [${color.fg.red}${interaction.commandName}${color.reset}] failed: ${error}`);
		await respond_error(interaction, "Command failed to be executed.");
	}
}

async function run_component(kind: ComponentKind, interaction: RepliableInteraction & { customId: string }): Promise<void> {
	const component = client.components.get(`${kind}_${interaction.customId}`);
	if (!component) return;

	try {
		await component.execute(interaction);
	} catch (error) {
		console.error(`${color.fg.red}⨯${color.reset} Component [${color.fg.red}${kind}_${interaction.customId}${color.reset}] failed: ${error}`);
		await respond_error(interaction, "This interaction failed to be processed.");
	}
}

export function bind_dispatch(): void {
	client.on(Events.InteractionCreate, async (interaction) => {
		if (interaction.isChatInputCommand()) return run_command(interaction);
		if (interaction.isButton()) return run_component("button", interaction);
		if (interaction.isModalSubmit()) return run_component("modal", interaction);
		if (interaction.isAnySelectMenu()) return run_component("select", interaction);
	});
}
