import { Events, Client } from "discord.js";
import { Event, BaseEvent } from "engine";
import color from "@/lib/colors";

@Event(Events.ClientReady, { once: true })
export default class Ready extends BaseEvent {
	async execute(client: Client) {
		console.log(`${color.fg.cyan}App ${color.reset}‣ ${color.fg.cyan}${client.user?.username}${color.reset} is online.`);
	}
}
