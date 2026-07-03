import color from "@/lib/colors";
import { tags } from "@/lib/tags";
import { config } from "config";
import { init_storage } from "@/lib/storage";
import { package_manager } from "@/lib/runtime";
import { client } from "./client";
import { load_env } from "./env";
import { is_deploy_outdated } from "./deploy_state";
import { load_commands } from "./loaders/commands";
import { load_context } from "./loaders/context";
import { load_prefixes } from "./loaders/prefixes";
import { load_events } from "./loaders/events";
import { load_tasks } from "./loaders/tasks";
import { load_components } from "./loaders/components";
import { load_routes } from "./loaders/routes";
import type { HttpServer } from "./loaders/routes";
import { bind_dispatch } from "./dispatch";
import { bind_prefix_dispatch } from "./prefix_dispatch";

function bind_process_handlers(server: HttpServer | undefined): void {
	let closing = false;
	const shutdown = async (signal: string) => {
		if (closing) return;
		closing = true;
		console.log(`${tags.app} ${signal} received, shutting down.`);
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
		console.error(`${color.fg.red}⨯${color.reset} ${tags.bot} ${error}`);
	});
}

function report_loaded(counts: { count: number; one: string; many: string }[]): void {
	const parts = counts.filter((entry) => entry.count > 0).map((entry) => `${tags.accent(entry.count)} ${entry.count === 1 ? entry.one : entry.many}`);
	if (parts.length > 0) console.log(`${tags.app} Loaded (${parts.join(", ")})`);
}

export async function boot(): Promise<void> {
	const env = load_env();
	await init_storage();

	const commands = await load_commands("./app/commands");
	const context = await load_context("./app/context");
	const prefixes = config.prefix.enabled ? await load_prefixes("./app/prefixes") : 0;
	const events = await load_events("./app/events");
	const tasks = await load_tasks("./app/tasks");
	const components = await load_components("./app/components");
	const server = await load_routes("./app/routes");

	report_loaded([
		{ count: commands, one: "command", many: "commands" },
		{ count: context, one: "context menu", many: "context menus" },
		{ count: prefixes, one: "prefix command", many: "prefix commands" },
		{ count: events, one: "event", many: "events" },
		{ count: tasks, one: "task", many: "tasks" },
		{ count: components, one: "component", many: "components" },
	]);

	if (is_deploy_outdated()) {
		console.warn(`${tags.app} ${color.fg.yellow}Slash commands are outdated${color.reset} — run ${tags.accent(`${package_manager()} run deploy`)} to update them.`);
	}

	bind_dispatch();
	if (config.prefix.enabled) bind_prefix_dispatch();
	bind_process_handlers(server);

	await client.login(env.token);
}
