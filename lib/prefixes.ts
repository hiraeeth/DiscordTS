import { config } from "config";
import { store } from "@/lib/store";

const prefixes = store<string>("prefixes");

export const MAX_PREFIX_LENGTH = 8;

export function is_valid_prefix(value: string): boolean {
	return value.length > 0 && value.length <= MAX_PREFIX_LENGTH && !/\s/.test(value);
}

export function get_prefix(guild_id: string | null): string {
	if (!guild_id) return config.prefix.default;
	return prefixes.get(guild_id) ?? config.prefix.default;
}

export function set_prefix(guild_id: string, prefix: string): void {
	prefixes.set(guild_id, prefix);
}

export function clear_prefix(guild_id: string): void {
	prefixes.delete(guild_id);
}

export function reset_cache(): void {
	prefixes.reload();
}
