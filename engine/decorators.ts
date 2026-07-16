import { register } from "./registry";
import { parse_duration } from "@/lib/duration";
import type { CommandOptions, ComponentOptions, EventOptions, PrefixOptions } from "./types";

export function Command(options: CommandOptions = {}) {
	return function (target: Function) {
		register(target, { kind: "command", options });
	};
}

export function Prefix(options: PrefixOptions = {}) {
	return function (target: Function) {
		register(target, { kind: "prefix", options });
	};
}

export function ContextMenu(options: CommandOptions = {}) {
	return function (target: Function) {
		register(target, { kind: "context", options });
	};
}

export function Event(name: string, options: EventOptions = {}) {
	return function (target: Function) {
		register(target, { kind: "event", options: { ...options, name } });
	};
}

export function Cron(expression: string) {
	return function (target: Function) {
		register(target, { kind: "task", options: { cron: expression } });
	};
}

export function Interval(duration: string | number) {
	return function (target: Function) {
		register(target, { kind: "task", options: { interval: parse_duration(duration) ?? 0 } });
	};
}

export function Register(id: string, options: ComponentOptions = {}) {
	return function (target: Function) {
		register(target, { kind: "component", options: { ...options, id } });
	};
}

export function Route(pattern: string) {
	return function (target: Function) {
		register(target, { kind: "route", options: { pattern } });
	};
}
