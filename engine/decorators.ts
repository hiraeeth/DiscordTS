import { register } from "./registry";
import type { CommandOptions, EventOptions } from "./types";

export function Command(options: CommandOptions = {}) {
	return function (target: Function) {
		register(target, { kind: "command", options });
	};
}

export function Event(name: string, options: EventOptions = {}) {
	return function (target: Function) {
		register(target, { kind: "event", options: { ...options, name } });
	};
}

export function Register(id: string) {
	return function (target: Function) {
		register(target, { kind: "component", options: { id } });
	};
}

export function Route(pattern: string) {
	return function (target: Function) {
		register(target, { kind: "route", options: { pattern } });
	};
}
