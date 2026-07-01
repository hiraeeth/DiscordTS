import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

export function scan(directory: string): string[] {
	const root = path.join(process.cwd(), directory);
	if (!fs.existsSync(root)) return [];

	const results: string[] = [];
	const walk = (dir: string) => {
		for (const entry of fs.readdirSync(dir)) {
			const full = path.join(dir, entry);
			if (fs.statSync(full).isDirectory()) {
				walk(full);
			} else if (entry.endsWith(".ts")) {
				results.push(full);
			}
		}
	};

	walk(root);
	return results;
}

export async function import_module(file: string): Promise<Record<string, any>> {
	return import(pathToFileURL(file).href);
}

export function relative(file: string): string {
	return path.relative(process.cwd(), file);
}
