import color from "@/lib/colors";
import { config } from "config";
import { client } from "../client";
import { registration_of } from "../registry";
import { scan, import_module, relative } from "./scan";
import type { BaseContextMenu } from "../base/context";

export async function load_context(directory: string): Promise<number> {
	for (const file of scan(directory)) {
		const feature = (await import_module(file)).default;
		if (!feature) continue;

		const registration = registration_of(feature);
		if (!registration || registration.kind !== "context") {
			console.error(`${color.fg.red}⨯${color.reset} [${color.fg.red}${relative(file)}${color.reset}] ‣ Missing ${color.fg.red}@ContextMenu${color.reset} decorator.`);
			continue;
		}

		const instance = new feature() as BaseContextMenu;
		instance.client = client;

		client.context.set(instance.data.name, {
			instance,
			data: instance.data,
			cooldown: registration.options.cooldown ?? config.commands.default_cooldown,
			cooldown_scope: registration.options.cooldown_scope,
			guilds: registration.options.guilds ?? config.commands.default_guilds,
			guards: registration.options.guards,
			globals: instance.globals,
		});
	}

	return client.context.size;
}
