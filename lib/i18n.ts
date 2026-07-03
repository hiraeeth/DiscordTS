import fs from "fs";
import path from "path";
import { config } from "config";
import type { LocalizationMap } from "discord.js";

type Dictionary = Record<string, unknown>;

let catalogs: Record<string, Dictionary> | null = null;

function directory(): string {
	return path.join(process.cwd(), config.localization.directory);
}

function load(): Record<string, Dictionary> {
	if (catalogs) return catalogs;

	catalogs = {};
	const dir = directory();
	if (!fs.existsSync(dir)) return catalogs;

	for (const file of fs.readdirSync(dir)) {
		if (!file.endsWith(".json")) continue;
		try {
			catalogs[file.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
		} catch {
			continue;
		}
	}

	return catalogs;
}

export function normalize_locale(locale: string): string {
	return locale.split("-")[0].toLowerCase();
}

function lookup(dictionary: Dictionary | undefined, key: string): string | undefined {
	let current: unknown = dictionary;
	for (const part of key.split(".")) {
		if (current === null || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return typeof current === "string" ? current : undefined;
}

function interpolate(text: string, vars?: Record<string, string | number>): string {
	if (!vars) return text;
	return text.replace(/\{(\w+)\}/g, (match, name) => (Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match));
}

export function t(key: string, locale?: string, vars?: Record<string, string | number>): string {
	const catalog = load();
	const fallback = config.localization.default;
	const wanted = config.localization.enabled && locale !== undefined ? normalize_locale(locale) : fallback;
	const resolved = lookup(catalog[wanted], key) ?? lookup(catalog[fallback], key);
	return interpolate(resolved ?? key, vars);
}

export function locale_of(source: { locale?: string | null }): string {
	return normalize_locale(source.locale ?? config.localization.default);
}

export function localizations(key: string): LocalizationMap {
	const catalog = load();
	const result: Record<string, string> = {};
	for (const locale of Object.keys(catalog)) {
		const value = lookup(catalog[locale], key);
		if (value !== undefined) result[locale] = value;
	}
	return result as LocalizationMap;
}

export function reset_i18n(): void {
	catalogs = null;
}
