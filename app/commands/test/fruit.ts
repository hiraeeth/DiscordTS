import { SlashCommandBuilder, AutocompleteInteraction } from "discord.js";
import { Command, BaseCommand, CommandContext } from "engine";

const FRUITS = ["apple", "apricot", "banana", "blueberry", "cherry", "grape", "mango", "orange", "peach", "pear"];

@Command({ guilds: ["*"] })
export default class Fruit extends BaseCommand {
	data = new SlashCommandBuilder()
		.setName("fruit")
		.setDescription("Pick a fruit with autocomplete.")
		.addStringOption((option) => option.setName("name").setDescription("Fruit name").setAutocomplete(true).setRequired(true));

	async execute(context: CommandContext) {
		await context.interaction.reply(`You picked ${context.interaction.options.getString("name", true)}.`);
	}

	async autocomplete(interaction: AutocompleteInteraction) {
		const focused = interaction.options.getFocused().toLowerCase();
		const matches = FRUITS.filter((fruit) => fruit.startsWith(focused)).slice(0, 25);
		await interaction.respond(matches.map((fruit) => ({ name: fruit, value: fruit })));
	}
}
