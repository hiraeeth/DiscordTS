import { SlashCommandBuilder } from "discord.js";
import { Command, BaseCommand, CommandContext, Subcommands } from "engine";

@Command({ guilds: ["*"] })
export default class Manage extends BaseCommand {
	data = new SlashCommandBuilder()
		.setName("manage")
		.setDescription("Demonstrates subcommand routing.")
		.addSubcommand((sub) => sub.setName("status").setDescription("Show the bot status."))
		.addSubcommand((sub) =>
			sub
				.setName("echo")
				.setDescription("Echo a message.")
				.addStringOption((option) => option.setName("text").setDescription("Text to echo").setRequired(true))
		);

	subcommands: Subcommands = {
		status: (context) => this.status(context),
		echo: (context) => this.echo(context),
	};

	async execute(context: CommandContext) {
		await this.run_subcommands(context);
	}

	private async status(context: CommandContext) {
		await context.interaction.reply(`Online with ${this.client.commands.size} commands loaded.`);
	}

	private async echo(context: CommandContext) {
		await context.interaction.reply(context.interaction.options.getString("text", true));
	}
}
