import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { Command, BaseCommand, CommandContext } from "engine";
import { confirm } from "@/helpers/dialog";

@Command({ guilds: ["*"] })
export default class Confirm extends BaseCommand {
	data = new SlashCommandBuilder().setName("confirm").setDescription("Demonstrates a confirmation dialog.");

	async execute(context: CommandContext) {
		const accepted = await confirm(context.interaction, {
			title: "Delete everything?",
			description: "This action cannot be undone.",
			confirm_label: "Delete",
			cancel_label: "Keep",
			danger: true,
		});

		await context.interaction.followUp({ content: accepted ? "Deleted (not really)." : "Cancelled — nothing was touched.", flags: MessageFlags.Ephemeral });
	}
}
