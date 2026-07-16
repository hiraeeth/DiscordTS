import { GatewayIntentBits, ActivityType } from "discord.js";
import type { PresenceData } from "discord.js";
import { color } from "@/helpers/color";
import type { StorageConfig } from "@/lib/storage/adapter";
import type { ServerConfig } from "@/engine/server_config";

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
	prefix: {
		enabled: true,
		default: ".",
		allow_mention: true,
	},
	console: {
		bullet: "•",
		bullet_color: color("#6b7280"),
		accent: color("#5865f2"),
		app: { text: "app", color: color("#5865f2") },
		bot: { text: "bot", color: color("#f29858") },
	},
	accent: color("#5865f2"),
	storage: { driver: "json" } as StorageConfig,
	localization: {
		enabled: false,
		default: "en",
		directory: "locales",
	},
	owners: (process.env.OWNERS ?? "")
		.split(",")
		.map((id) => id.trim())
		.filter((id) => id.length > 0),
	server: {
		enabled: false,
		host: "127.0.0.1",
		port: 3000,
		prefix: "/api",
		trust_proxy: false,
		expose_errors: false,
		cors: {
			enabled: true,
			origins: [],
			methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			headers: ["content-type", "authorization"],
			credentials: false,
		},
		auth: {
			enabled: true,
			scheme: "bearer",
			header: "authorization",
			tokens: (process.env.API_TOKENS ?? "")
				.split(",")
				.map((token) => token.trim())
				.filter((token) => token.length > 0),
			public_paths: ["/health"],
		},
		rate_limit: {
			enabled: true,
			window: "1m",
			max: 100,
			scope: "ip",
			public_paths: [],
		},
		rules: [],
	} as ServerConfig,
};
