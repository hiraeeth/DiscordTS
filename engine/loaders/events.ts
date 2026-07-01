import color from "@/lib/colors";
import { client } from "../client";
import { registration_of } from "../registry";
import { scan, import_module, relative } from "./scan";
import type { BaseEvent } from "../base/event";

export async function load_events(directory: string): Promise<void> {
	let count = 0;

	for (const file of scan(directory)) {
		const feature = (await import_module(file)).default;
		if (!feature) continue;

		const registration = registration_of(feature);
		if (!registration || registration.kind !== "event") {
			console.error(`${color.fg.red}⨯${color.reset} [${color.fg.red}${relative(file)}${color.reset}] ‣ Missing ${color.fg.red}@Event${color.reset} decorator.`);
			continue;
		}

		const instance = new feature() as BaseEvent;
		instance.client = client;

		const { name, once } = registration.options;
		const handler = (...args: unknown[]) => instance.execute(...args);
		if (once) {
			client.once(name, handler);
		} else {
			client.on(name, handler);
		}
		count++;
	}

	if (count > 0) {
		console.log(`${color.fg.cyan}App ${color.reset}‣ Loaded ${color.fg.cyan}${count}${color.reset} ${count > 1 ? "events" : "event"}.`);
	}
}
