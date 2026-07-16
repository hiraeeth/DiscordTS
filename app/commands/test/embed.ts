import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { Command, BaseCommand, CommandContext } from "engine";
import { embed, EMBED_COLORS } from "@/helpers/embeds";

const COLOR_KEYS = Object.keys(EMBED_COLORS) as (keyof typeof EMBED_COLORS)[];

@Command({ guilds: ["*"] })
export default class Embed extends BaseCommand {
	data = new SlashCommandBuilder()
		.setName("embed")
		.setDescription("Builds a fully configurable embed from the options you pass.")
		.addStringOption((option) => option.setName("title").setDescription("Title shown at the top"))
		.addStringOption((option) => option.setName("description").setDescription("Main body text"))
		.addStringOption((option) =>
			option
				.setName("color")
				.setDescription("Palette colour")
				.addChoices(...COLOR_KEYS.map((key) => ({ name: key, value: key })))
		)
		.addStringOption((option) => option.setName("author").setDescription("Author line above the title"))
		.addStringOption((option) => option.setName("footer").setDescription("Footer text at the bottom"))
		.addStringOption((option) => option.setName("thumbnail").setDescription("Small image URL (top-right)"))
		.addStringOption((option) => option.setName("image").setDescription("Large image URL (bottom)"))
		.addBooleanOption((option) => option.setName("timestamp").setDescription("Stamp the current time"))
		.addBooleanOption((option) => option.setName("ephemeral").setDescription("Only you can see the reply"));

	async execute(context: CommandContext) {
		const options = context.interaction.options;

		const title = options.getString("title") ?? undefined;
		const description = options.getString("description") ?? undefined;
		const author = options.getString("author") ?? undefined;
		const footer = options.getString("footer") ?? undefined;
		const thumbnail = options.getString("thumbnail") ?? undefined;
		const image = options.getString("image") ?? undefined;
		const color_key = options.getString("color") as keyof typeof EMBED_COLORS | null;

		const configured = [title, description, author, footer, thumbnail, image].some((value) => value !== undefined);
		const built = embed({
			title,
			description: configured ? description : "Pass options like `title`, `description`, `color`, or `image` to shape this embed.",
			color: color_key !== null ? EMBED_COLORS[color_key] : undefined,
			author,
			footer,
			thumbnail,
			image,
			timestamp: options.getBoolean("timestamp") ?? undefined,
		});

		const ephemeral = options.getBoolean("ephemeral") ?? false;
		await context.interaction.reply({ embeds: [built], flags: ephemeral ? MessageFlags.Ephemeral : undefined });
	}
}
