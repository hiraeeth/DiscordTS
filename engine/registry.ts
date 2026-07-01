import type { CommandOptions, EventOptions } from "./types";

export type Registration =
	| { kind: "command"; options: CommandOptions }
	| { kind: "event"; options: EventOptions & { name: string } }
	| { kind: "component"; options: { id: string } }
	| { kind: "route"; options: { pattern: string } };

const registrations = new Map<Function, Registration>();

export function register(target: Function, registration: Registration): void {
	registrations.set(target, registration);
}

export function registration_of(target: Function): Registration | undefined {
	return registrations.get(target);
}
