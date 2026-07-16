import { config } from "config";
import { JsonStorage } from "./json";
import { MemoryStorage } from "./memory";
import type { StorageAdapter } from "./adapter";

export type { StorageAdapter, StorageDriver, StorageConfig } from "./adapter";

let active: StorageAdapter | null = null;

function resolve(): StorageAdapter {
	const setting = config.storage;
	if (setting.adapter) return setting.adapter;
	if (setting.driver === "custom") throw new Error("config.storage.driver is 'custom' but config.storage.adapter is not set.");
	if (setting.driver === "memory") return new MemoryStorage();
	return new JsonStorage();
}

export function storage(): StorageAdapter {
	if (!active) active = resolve();
	return active;
}

export function set_storage(adapter: StorageAdapter | null): void {
	active = adapter;
}

export async function init_storage(): Promise<void> {
	const adapter = storage();
	if (adapter.init) await adapter.init();
}
