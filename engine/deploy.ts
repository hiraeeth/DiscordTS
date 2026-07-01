import { REST, Routes } from "discord.js";
import color from "@/lib/colors";
import { client } from "./client";
import { load_env } from "./env";
import { load_commands } from "./loaders/commands";

export async function deploy_commands(): Promise<void> {
	const env = load_env();
	await load_commands("./app/commands");

	const rest = new REST({ version: "10" }).setToken(env.token);
	const groups: Record<string, unknown[]> = {};

	for (const command of client.commands.values()) {
		for (const guild of command.guilds) {
			(groups[guild] ??= []).push(command.data.toJSON());
		}
	}

	const started = Date.now();
	for (const guild of Object.keys(groups)) {
		if (guild === "*") {
			await rest.put(Routes.applicationCommands(env.client_id), { body: groups[guild] });
		} else {
			await rest.put(Routes.applicationGuildCommands(env.client_id, guild), { body: groups[guild] });
		}
	}

	const seconds = ((Date.now() - started) / 1000).toFixed(2);
	console.log(
		`${color.fg.cyan}App ${color.reset}‣ [${color.fg.cyan}${seconds}s${color.reset}] Deployed ${color.fg.cyan}${client.commands.size}${color.reset} application (/) ${client.commands.size === 1 ? "command" : "commands"}.`
	);
}
