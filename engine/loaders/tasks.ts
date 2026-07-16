import color from "@/lib/colors";
import { client } from "../client";
import { registration_of } from "../registry";
import { scan, import_module, relative } from "./scan";
import { cron_matches, validate_cron } from "../cron";
import type { BaseTask } from "../base/task";

interface CronTask {
	instance: BaseTask;
	expression: string;
	label: string;
}

function run(instance: BaseTask, label: string): void {
	instance.execute().catch((error) => {
		console.error(`${color.fg.red}⨯${color.reset} Task [${color.fg.red}${label}${color.reset}] failed: ${error}`);
	});
}

function start_cron(tasks: CronTask[]): void {
	const tick = () => {
		const now = new Date();
		for (const task of tasks) {
			if (cron_matches(task.expression, now)) run(task.instance, task.label);
		}
	};

	const delay = (60 - new Date().getSeconds()) * 1000;
	setTimeout(() => {
		tick();
		setInterval(tick, 60_000);
	}, delay);
}

export async function load_tasks(directory: string): Promise<number> {
	const cron_tasks: CronTask[] = [];
	let count = 0;

	for (const file of scan(directory)) {
		const feature = (await import_module(file)).default;
		if (!feature) continue;

		const registration = registration_of(feature);
		if (!registration || registration.kind !== "task") {
			console.error(
				`${color.fg.red}⨯${color.reset} [${color.fg.red}${relative(file)}${color.reset}] ‣ Missing ${color.fg.red}@Cron${color.reset} or ${color.fg.red}@Interval${color.reset} decorator.`
			);
			continue;
		}

		const instance = new feature() as BaseTask;
		instance.client = client;
		const label = feature.name;

		if (registration.options.interval !== undefined && registration.options.interval > 0) {
			setInterval(() => run(instance, label), registration.options.interval);
			count++;
		} else if (registration.options.cron !== undefined) {
			if (!validate_cron(registration.options.cron)) {
				console.warn(`${color.fg.yellow}⚠${color.reset} Task [${color.fg.yellow}${label}${color.reset}] has an invalid cron expression "${registration.options.cron}" - it will never run.`);
			}
			cron_tasks.push({ instance, expression: registration.options.cron, label });
			count++;
		}
	}

	if (cron_tasks.length > 0) start_cron(cron_tasks);
	return count;
}
