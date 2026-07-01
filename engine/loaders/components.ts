import color from "@/lib/colors";
import { client } from "../client";
import { registration_of } from "../registry";
import { scan, import_module, relative } from "./scan";
import type { Component } from "../base/component";

export async function load_components(directory: string): Promise<void> {
	for (const file of scan(directory)) {
		const feature = (await import_module(file)).default;
		if (!feature) continue;

		const registration = registration_of(feature);
		if (!registration || registration.kind !== "component") {
			console.error(`${color.fg.red}⨯${color.reset} [${color.fg.red}${relative(file)}${color.reset}] ‣ Missing ${color.fg.red}@Register${color.reset} decorator.`);
			continue;
		}

		const instance = new feature() as Component;
		instance.client = client;
		instance.id = registration.options.id;

		client.components.set(`${instance.kind}_${instance.id}`, instance);
	}

	if (client.components.size > 0) {
		console.log(`${color.fg.cyan}App ${color.reset}‣ Loaded ${color.fg.cyan}${client.components.size}${color.reset} ${client.components.size > 1 ? "components" : "component"}.`);
	}
}
