import { client } from "./client";
import { store } from "@/lib/store";

const state = store<string>("deploy");

export function hash(text: string): string {
	const prime = 0x100000001b3n;
	const mask = 0xffffffffffffffffn;
	let value = 0xcbf29ce484222325n;
	for (let i = 0; i < text.length; i++) {
		value = ((value ^ BigInt(text.charCodeAt(i))) * prime) & mask;
	}
	return value.toString(16);
}

export function command_signature(): string {
	const entries: string[] = [];
	for (const command of client.commands.values()) entries.push(JSON.stringify(command.data.toJSON()));
	for (const entry of client.context.values()) entries.push(JSON.stringify(entry.data.toJSON()));
	entries.sort();
	return hash(entries.join("\n"));
}

export function save_deploy_signature(): void {
	state.set("signature", command_signature());
}

export function is_deploy_outdated(): boolean {
	return state.get("signature") !== command_signature();
}
