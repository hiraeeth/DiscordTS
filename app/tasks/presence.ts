import { ActivityType } from "discord.js";
import { Interval, BaseTask } from "engine";

const ACTIVITIES = [
	{ name: "the server", type: ActivityType.Watching },
	{ name: "with slash commands", type: ActivityType.Playing },
	{ name: "your requests", type: ActivityType.Listening },
];

@Interval("30s")
export default class Presence extends BaseTask {
	private index = 0;

	async execute() {
		if (!this.client.user) return;
		this.client.user.setActivity(ACTIVITIES[this.index % ACTIVITIES.length]);
		this.index++;
	}
}
