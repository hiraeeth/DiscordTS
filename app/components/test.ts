import type { AnySelectMenuInteraction } from "discord.js";
import { Register, SelectComponent } from "engine";

@Register("my_select_menu")
export default class MySelectMenu extends SelectComponent {
	async execute(interaction: AnySelectMenuInteraction) {
		const selected = interaction.isStringSelectMenu() ? interaction.values[0] : "unknown";
		await interaction.reply(`You selected ${selected}!`);
	}
}
