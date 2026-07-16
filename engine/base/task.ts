import type { Client } from "discord.js";

export abstract class BaseTask {
	client!: Client;

	abstract execute(): Promise<void>;
}
