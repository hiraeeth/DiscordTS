import { GatewayIntentBits, ActivityType } from "discord.js";
import type { PresenceData } from "discord.js";

export const config = {
	bot: {
		intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent],
		presence: {
			status: "online",
			activities: [{ name: "the server", type: ActivityType.Watching }],
		} as PresenceData,
	},
	commands: {
		default_cooldown: 0,
		default_guilds: ["*"] as string[],
	},
	server: {
		enabled: false,
		host: "0.0.0.0",
		port: 3000,
		prefix: "/api",
		cors: true,
	},
};
