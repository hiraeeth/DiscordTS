import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const manifest_path = join(process.cwd(), "package.json");
const manifest = JSON.parse(readFileSync(manifest_path, "utf8"));

const removed_scripts = ["lint", "format", "format:check", "test"];
const removed_dev_dependencies = ["@eslint/js", "eslint", "eslint-config-prettier", "globals", "prettier", "typescript-eslint"];

if (manifest.scripts !== undefined) {
	for (const name of removed_scripts) delete manifest.scripts[name];
}

if (manifest.devDependencies !== undefined) {
	for (const name of removed_dev_dependencies) delete manifest.devDependencies[name];
}

delete manifest.workspaces;

writeFileSync(manifest_path, `${JSON.stringify(manifest, null, "\t")}\n`);
