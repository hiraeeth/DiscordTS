import color from "@/lib/colors";
import { client } from "./client";
import { load_env } from "./env";
import { load_commands } from "./loaders/commands";
import { load_events } from "./loaders/events";
import { load_components } from "./loaders/components";
import { load_routes } from "./loaders/routes";
import type { HttpServer } from "./loaders/routes";
import { bind_dispatch } from "./dispatch";

function bind_process_handlers(server: HttpServer | undefined): void {
	let closing = false;
	const shutdown = async (signal: string) => {
		if (closing) return;
		closing = true;
		console.log(`${color.fg.cyan}App ${color.reset}‣ ${signal} received, shutting down.`);
		try {
			server?.stop();
			await client.destroy();
		} finally {
			process.exit(0);
		}
	};

	process.on("SIGINT", () => void shutdown("SIGINT"));
	process.on("SIGTERM", () => void shutdown("SIGTERM"));
	process.on("uncaughtException", (error) => {
		console.error(`${color.fg.red}⨯${color.reset} ${color.fg.red}Uncaught Exception${color.reset} ‣ ${error}`);
	});
	process.on("unhandledRejection", (reason) => {
		console.error(`${color.fg.red}⨯${color.reset} ${color.fg.red}Unhandled Rejection${color.reset} ‣ ${reason}`);
	});
	client.on("error", (error) => {
		console.error(`${color.fg.red}⨯${color.reset} [${color.fg.red}DISCORD${color.reset}] ‣ ${error}`);
	});
}

export async function boot(): Promise<void> {
	const env = load_env();

	await load_commands("./app/commands");
	await load_events("./app/events");
	await load_components("./app/components");
	const server = await load_routes("./app/routes");

	bind_dispatch();
	bind_process_handlers(server);

	await client.login(env.token);
}
