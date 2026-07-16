import { SlashCommandBuilder } from "discord.js";
import { Command, BaseCommand, CommandContext } from "engine";
import { t, locale_of } from "@/lib/i18n";

@Command({ guilds: ["*"] })
export default class Hello extends BaseCommand {
	data = new SlashCommandBuilder().setName("hello").setDescription("Greets you in your language.");

	async execute(context: CommandContext) {
		const locale = locale_of(context.interaction);
		await context.interaction.reply(t("hello.greeting", locale, { user: context.interaction.user.username }));
	}
}
