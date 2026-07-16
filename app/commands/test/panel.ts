import { SlashCommandBuilder, ButtonStyle } from "discord.js";
import { Command, BaseCommand, CommandContext, container, text, separator, section, view, ButtonBuilder } from "engine";

@Command({ guilds: ["*"] })
export default class Panel extends BaseCommand {
	data = new SlashCommandBuilder().setName("panel").setDescription("Shows a Components V2 panel.");

	async execute(context: CommandContext) {
		const layout = container(
			text("## Components V2 panel"),
			separator(),
			section(["Press the button on the right."], new ButtonBuilder().setCustomId("panel_button").setLabel("Click me").setStyle(ButtonStyle.Primary))
		);

		await context.interaction.reply(view(layout));
	}
}
