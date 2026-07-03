import fs from "fs";
import path from "path";
import color from "@/lib/colors";
import type { StorageAdapter } from "./adapter";

interface Cached {
	data: Record<string, unknown>;
	mtime: number;
}

function data_dir(): string {
	return process.env.DATA_DIR ?? path.join(process.cwd(), "data");
}

export class JsonStorage implements StorageAdapter {
	private readonly caches = new Map<string, Cached>();

	private file(namespace: string): string {
		return path.join(data_dir(), `${namespace}.json`);
	}

	private mtime(file: string): number {
		try {
			return fs.statSync(file).mtimeMs;
		} catch {
			return 0;
		}
	}

	private quarantine(file: string): string {
		const corrupt = `${file}.${process.pid}.corrupt`;
		try {
			fs.rmSync(corrupt, { force: true });
			fs.renameSync(file, corrupt);
		} catch {
			return file;
		}
		return corrupt;
	}

	private read(namespace: string): Record<string, unknown> {
		const file = this.file(namespace);
		if (!fs.existsSync(file)) return {};

		try {
			const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
			if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
			return {};
		} catch {
			const moved = this.quarantine(file);
			console.error(`${color.fg.red}⨯${color.reset} Storage namespace [${color.fg.red}${namespace}${color.reset}] is corrupt; preserved as ${color.fg.yellow}${moved}${color.reset}.`);
			return {};
		}
	}

	private load(namespace: string): Record<string, unknown> {
		const file = this.file(namespace);
		const disk_mtime = this.mtime(file);
		const cached = this.caches.get(namespace);
		if (cached && cached.mtime === disk_mtime) return cached.data;

		const data = this.read(namespace);
		this.caches.set(namespace, { data, mtime: this.mtime(file) });
		return data;
	}

	private persist(namespace: string, data: Record<string, unknown>): void {
		const file = this.file(namespace);
		fs.mkdirSync(path.dirname(file), { recursive: true });

		const temp = `${file}.${process.pid}.tmp`;
		fs.writeFileSync(temp, JSON.stringify(data, null, "\t"));
		fs.renameSync(temp, file);

		this.caches.set(namespace, { data, mtime: this.mtime(file) });
	}

	get(namespace: string, key: string): unknown {
		return this.load(namespace)[key];
	}

	has(namespace: string, key: string): boolean {
		return key in this.load(namespace);
	}

	set(namespace: string, key: string, value: unknown): void {
		const data = this.load(namespace);
		data[key] = value;
		this.persist(namespace, data);
	}

	delete(namespace: string, key: string): void {
		const data = this.load(namespace);
		if (!(key in data)) return;
		delete data[key];
		this.persist(namespace, data);
	}

	all(namespace: string): Record<string, unknown> {
		return { ...this.load(namespace) };
	}

	keys(namespace: string): string[] {
		return Object.keys(this.load(namespace));
	}

	clear(namespace: string): void {
		this.persist(namespace, {});
	}

	reload(namespace: string): void {
		this.caches.delete(namespace);
	}
}
