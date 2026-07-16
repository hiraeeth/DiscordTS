import type { CommandOptions, ComponentOptions, EventOptions, PrefixOptions, TaskOptions } from "./types";

export type Registration =
	| { kind: "command"; options: CommandOptions }
	| { kind: "context"; options: CommandOptions }
	| { kind: "prefix"; options: PrefixOptions }
	| { kind: "event"; options: EventOptions & { name: string } }
	| { kind: "task"; options: TaskOptions }
	| { kind: "component"; options: ComponentOptions & { id: string } }
	| { kind: "route"; options: { pattern: string } };

const registrations = new Map<Function, Registration>();

export function register(target: Function, registration: Registration): void {
	registrations.set(target, registration);
}

export function registration_of(target: Function): Registration | undefined {
	return registrations.get(target);
}
