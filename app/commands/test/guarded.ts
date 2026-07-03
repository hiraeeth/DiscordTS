import { SlashCommandBuilder } from "discord.js";
import { Command, BaseCommand, CommandContext, in_guild, has_perms } from "engine";

@Command({ cooldown: 10, cooldown_scope: "user", guards: [in_guild, has_perms("ManageGuild")] })
export default class Guarded extends BaseCommand {
	data = new SlashCommandBuilder().setName("guarded").setDescription("Runs only for managers, once every 10s per user.");

	async execute(context: CommandContext) {
		await context.interaction.reply("You passed the guards.");
	}
}
