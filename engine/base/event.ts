import type { Client } from "discord.js";

export abstract class BaseEvent {
	client!: Client;

	abstract execute(...args: any[]): Promise<void>;
}
