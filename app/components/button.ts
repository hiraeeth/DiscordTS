import { MessageFlags } from "discord.js";
import type { ButtonInteraction } from "discord.js";
import { Register, ButtonComponent } from "engine";

@Register("panel_button")
export default class PanelButton extends ButtonComponent {
	async execute(interaction: ButtonInteraction) {
		await interaction.reply({ content: "You clicked the panel button!", flags: MessageFlags.Ephemeral });
	}
}
