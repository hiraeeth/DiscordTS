import { SlashCommandBuilder } from "discord.js";
import { Command, BaseCommand, CommandContext } from "engine";
import { panel } from "@/helpers/panel";
import { EMBED_COLORS } from "@/helpers/embeds";

interface SettingsState {
	greeting: string;
	notifications: boolean;
	theme: string;
}

@Command({ guilds: ["*"] })
export default class Settings extends BaseCommand {
	data = new SlashCommandBuilder().setName("settings").setDescription("Opens an interactive settings panel.");
	globals = { greeting: "Hello there", notifications: true, theme: "system" };

	async execute(context: CommandContext) {
		const state = context.globals as unknown as SettingsState;

		await panel(context.interaction, {
			title: "Bot settings",
			description: "Pick a setting from the menu to change it.",
			color: EMBED_COLORS.info,
			settings: [
				{
					key: "greeting",
					label: "Greeting",
					description: "Message shown to new members",
					kind: "text",
					max: 100,
					get: () => state.greeting,
					set: (value) => {
						state.greeting = value;
					},
				},
				{
					key: "notifications",
					label: "Notifications",
					kind: "boolean",
					get: () => state.notifications,
					set: (value) => {
						state.notifications = value;
					},
				},
				{
					key: "theme",
					label: "Theme",
					kind: "choice",
					choices: [
						{ label: "Light", value: "light" },
						{ label: "Dark", value: "dark" },
						{ label: "System", value: "system" },
					],
					get: () => state.theme,
					set: (value) => {
						state.theme = value;
					},
				},
			],
		});
	}
}
