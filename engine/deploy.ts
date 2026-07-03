import { REST, Routes } from "discord.js";
import { tags } from "@/lib/tags";
import { init_storage } from "@/lib/storage";
import { client } from "./client";
import { load_env } from "./env";
import { load_commands } from "./loaders/commands";
import { load_context } from "./loaders/context";
import { save_deploy_signature } from "./deploy_state";

export async function deploy_commands(): Promise<void> {
	const env = load_env();
	await init_storage();
	await load_commands("./app/commands");
	await load_context("./app/context");

	const rest = new REST({ version: "10" }).setToken(env.token);
	const groups: Record<string, unknown[]> = {};

	for (const command of client.commands.values()) {
		for (const guild of command.guilds) {
			(groups[guild] ??= []).push(command.data.toJSON());
		}
	}

	for (const entry of client.context.values()) {
		for (const guild of entry.guilds) {
			(groups[guild] ??= []).push(entry.data.toJSON());
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
	const total = client.commands.size + client.context.size;
	console.log(`${tags.bot} [${tags.accent(`${seconds}s`)}] Deployed ${tags.accent(total)} application ${total === 1 ? "command" : "commands"}.`);

	save_deploy_signature();
}
