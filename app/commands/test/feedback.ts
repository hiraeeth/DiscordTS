import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { Command, BaseCommand, CommandContext } from "engine";
import { form } from "@/helpers/form";

@Command({ guilds: ["*"] })
export default class Feedback extends BaseCommand {
	data = new SlashCommandBuilder().setName("feedback").setDescription("Send feedback through a modal form.");

	async execute(context: CommandContext) {
		const result = await form(context.interaction, {
			title: "Feedback",
			fields: [
				{ key: "subject", label: "Subject", required: true, max: 100 },
				{ key: "body", label: "Details", style: "paragraph", required: true, max: 1000 },
				{ key: "rating", label: "Rating (1-5)", kind: "number", required: true, min: 1, max: 5 },
			],
		});

		if (!result) return;
		await result.interaction.reply({ content: `Thanks! **${result.values.subject}** rated ${result.values.rating}/5.`, flags: MessageFlags.Ephemeral });
	}
}
