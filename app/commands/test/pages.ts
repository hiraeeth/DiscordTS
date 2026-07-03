import { SlashCommandBuilder } from "discord.js";
import { Command, BaseCommand, CommandContext } from "engine";
import { fields_to_pages, EMBED_COLORS } from "@/helpers/embeds";
import { paginate } from "@/helpers/pagination";

@Command({ guilds: ["*"] })
export default class Pages extends BaseCommand {
	data = new SlashCommandBuilder().setName("pages").setDescription("Demonstrates paginated embeds.");

	async execute(context: CommandContext) {
		const items: string[] = [];
		for (let i = 1; i <= 47; i++) items.push(`Item number ${i}`);

		const pages = fields_to_pages(items, {
			per_page: 8,
			base: { title: "Paginated list", color: EMBED_COLORS.info },
			render: (item, index) => ({ name: `Entry #${index + 1}`, value: item }),
		});

		await paginate(context.interaction, pages, { timeout: 60_000 });
	}
}
