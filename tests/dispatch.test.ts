import { afterEach, describe, expect, test } from "bun:test";
import { PermissionsBitField } from "discord.js";
import type { AutocompleteInteraction, RepliableInteraction } from "discord.js";
import { run_autocomplete, run_component, component_id } from "@/engine/dispatch";
import { client } from "@/engine/client";
import { cooldowns } from "@/lib/cooldowns";
import type { RegisteredCommand, RegisteredComponent } from "@/engine/client";
import type { Guard } from "@/engine/guards";

const COMMAND_NAME = "autocomplete_probe";

function register(guards: Guard[] | undefined, on_autocomplete: () => void): void {
	const command = {
		instance: { autocomplete: async () => on_autocomplete() },
		guards,
		cooldown: 0,
		guilds: ["*"],
		globals: {},
	} as unknown as RegisteredCommand;
	client.commands.set(COMMAND_NAME, command);
}

function fake_interaction(responded: unknown[]): AutocompleteInteraction {
	return {
		commandName: COMMAND_NAME,
		user: { id: "1" },
		guild: null,
		channel: null,
		memberPermissions: null,
		appPermissions: new PermissionsBitField(),
		respond: async (choices: unknown) => {
			responded.push(choices);
		},
	} as unknown as AutocompleteInteraction;
}

describe("run_autocomplete guards", () => {
	afterEach(() => {
		client.commands.delete(COMMAND_NAME);
	});

	test("skips the handler and responds empty when a guard denies", async () => {
		let calls = 0;
		register([() => "denied"], () => {
			calls++;
		});
		const responded: unknown[] = [];
		await run_autocomplete(fake_interaction(responded));

		expect(calls).toBe(0);
		expect(responded).toEqual([[]]);
	});

	test("runs the handler when guards pass", async () => {
		let calls = 0;
		register([() => true], () => {
			calls++;
		});
		const responded: unknown[] = [];
		await run_autocomplete(fake_interaction(responded));

		expect(calls).toBe(1);
		expect(responded).toEqual([]);
	});

	test("runs the handler when there are no guards", async () => {
		let calls = 0;
		register(undefined, () => {
			calls++;
		});
		await run_autocomplete(fake_interaction([]));

		expect(calls).toBe(1);
	});
});

describe("component_id", () => {
	test("returns the whole id when there is no separator", () => {
		expect(component_id("panel_select")).toBe("panel_select");
	});

	test("returns the base id before the separator for dynamic ids", () => {
		expect(component_id("vote:up:extra")).toBe("vote");
	});
});

const COMPONENT_KEY = "button_vote";

function register_component(overrides: Partial<RegisteredComponent>, on_execute: () => void): void {
	client.components.set(COMPONENT_KEY, {
		instance: { execute: async () => on_execute() },
		cooldown: 0,
		...overrides,
	} as unknown as RegisteredComponent);
}

function fake_component(custom_id: string, replies: unknown[]): RepliableInteraction & { customId: string } {
	return {
		customId: custom_id,
		user: { id: "1" },
		guild: null,
		guildId: null,
		channel: null,
		channelId: null,
		replied: false,
		deferred: false,
		memberPermissions: null,
		appPermissions: new PermissionsBitField(),
		reply: async (payload: unknown) => {
			replies.push(payload);
		},
	} as unknown as RepliableInteraction & { customId: string };
}

describe("run_component", () => {
	afterEach(() => {
		client.components.delete(COMPONENT_KEY);
		cooldowns.clear();
	});

	test("routes a dynamic custom id to the handler registered under its base id", async () => {
		let calls = 0;
		register_component({}, () => {
			calls++;
		});
		await run_component("button", fake_component("vote:up", []));
		expect(calls).toBe(1);
	});

	test("blocks execution and replies when a guard denies", async () => {
		let calls = 0;
		register_component({ guards: [() => "not yours"] }, () => {
			calls++;
		});
		const replies: unknown[] = [];
		await run_component("button", fake_component("vote:up", replies));

		expect(calls).toBe(0);
		expect(replies.length).toBe(1);
	});

	test("enforces a cooldown after the first use", async () => {
		let calls = 0;
		register_component({ cooldown: 30 }, () => {
			calls++;
		});
		await run_component("button", fake_component("vote", []));
		const replies: unknown[] = [];
		await run_component("button", fake_component("vote", replies));

		expect(calls).toBe(1);
		expect(replies.length).toBe(1);
	});
});
