import { Events, Client } from "discord.js";
import { Event, BaseEvent } from "engine";
import { tags } from "@/lib/tags";

@Event(Events.ClientReady, { once: true })
export default class Ready extends BaseEvent {
	async execute(client: Client) {
		console.log(`${tags.bot} ${tags.accent(client.user?.username ?? "")} is online.`);
	}
}
