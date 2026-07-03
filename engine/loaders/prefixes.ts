import color from "@/lib/colors";
import { config } from "config";
import { client } from "../client";
import { registration_of } from "../registry";
import { scan, import_module, relative } from "./scan";
import type { BasePrefixCommand } from "../base/prefix";

export async function load_prefixes(directory: string): Promise<number> {
	let count = 0;
	const claimed = new Map<string, string>();

	for (const file of scan(directory)) {
		const feature = (await import_module(file)).default;
		if (!feature) continue;

		const registration = registration_of(feature);
		if (!registration || registration.kind !== "prefix") {
			console.error(`${color.fg.red}⨯${color.reset} [${color.fg.red}${relative(file)}${color.reset}] ‣ Missing ${color.fg.red}@Prefix${color.reset} decorator.`);
			continue;
		}

		const instance = new feature() as BasePrefixCommand;
		instance.client = client;

		const name = instance.data.name;
		for (const label of [name, ...instance.data.aliases]) {
			const owner = claimed.get(label);
			if (owner !== undefined) {
				console.warn(
					`${color.fg.yellow}⚠${color.reset} Prefix ${label === name ? "command name" : "alias"} [${color.fg.yellow}${label}${color.reset}] of ${name} collides with ${color.fg.yellow}${owner}${color.reset} — rename one to resolve the ambiguity.`
				);
			} else {
				claimed.set(label, name);
			}
		}

		client.prefixes.set(instance.data.name, {
			instance,
			data: instance.data,
			cooldown: registration.options.cooldown ?? config.commands.default_cooldown,
			cooldown_scope: registration.options.cooldown_scope,
			guilds: registration.options.guilds ?? config.commands.default_guilds,
			guards: registration.options.guards,
			globals: instance.globals,
		});
		count++;
	}

	return count;
}
