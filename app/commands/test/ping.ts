import { SlashCommandBuilder } from "discord.js";
import { Command, BaseCommand, CommandContext } from "engine";

@Command({ cooldown: 5, guilds: ["*"] })
export default class Ping extends BaseCommand {
	data = new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!");
	globals = { some_variable: "test" };

	async execute(context: CommandContext) {
		await context.interaction.reply(`Pong! (${context.globals.some_variable})`);
	}
}
