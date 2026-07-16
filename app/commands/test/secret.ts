import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { Command, BaseCommand, CommandContext } from "engine";

@Command({ guilds: ["*"] })
export default class Secret extends BaseCommand {
	data = new SlashCommandBuilder().setName("secret").setDescription("Only members with Manage Server can use this.");

	async execute(context: CommandContext) {
		if (!context.permissions.has("ManageGuild")) {
			await context.interaction.reply({ content: "You need the Manage Server permission to use this.", flags: MessageFlags.Ephemeral });
			return;
		}

		await context.interaction.reply("Welcome, moderator.");
	}
}
