import fs from "fs";
import path from "path";

type Level = "log" | "warn" | "debug" | "error";

const LOG_DIR = path.join(process.cwd(), "logs");
const ANSI = /\x1b\[[0-9;]*m/g;

const original = {
	log: console.log.bind(console),
	warn: console.warn.bind(console),
	debug: console.debug.bind(console),
	error: console.error.bind(console),
};

function stamp(): string {
	const now = new Date();
	const day = String(now.getDate()).padStart(2, "0");
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const year = String(now.getFullYear()).slice(-2);
	return `${day}_${month}_${year}`;
}

function timestamp(): string {
	return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function file_for(level: Level): string {
	const name = level === "error" ? "errors" : "log";
	return path.join(LOG_DIR, `${name}_${stamp()}.log`);
}

function serialize(parts: unknown[]): string {
	return parts
		.map((part) => {
			if (typeof part === "string") return part;
			if (part instanceof Error) return part.stack ?? part.message;
			try {
				return JSON.stringify(part);
			} catch {
				return String(part);
			}
		})
		.join(" ");
}

function persist(level: Level, message: string): void {
	try {
		if (!fs.existsSync(LOG_DIR)) {
			fs.mkdirSync(LOG_DIR, { recursive: true });
		}
		const line = `[${timestamp()}] [${level}] ${message.replace(ANSI, "")}\n`;
		fs.appendFileSync(file_for(level), line);
	} catch (error) {
		original.error(error);
	}
}

let patched = false;

export function install_console(): void {
	if (patched) return;
	patched = true;

	const proxy = console as unknown as Record<string, unknown>;
	proxy._raw_log = original.log;
	proxy._raw_warn = original.warn;
	proxy._raw_debug = original.debug;
	proxy._raw_error = original.error;

	console.log = (...parts: unknown[]) => {
		original.log(...parts);
		persist("log", serialize(parts));
	};
	console.debug = (...parts: unknown[]) => {
		original.debug(...parts);
		persist("debug", serialize(parts));
	};
	console.warn = (...parts: unknown[]) => {
		original.warn(...parts);
		persist("warn", serialize(parts));
	};
	console.error = (...parts: unknown[]) => {
		original.error(...parts);
		persist("error", serialize(parts));
	};
}

const logger = {
	log: (message: string) => persist("log", message),
	warn: (message: string) => persist("warn", message),
	debug: (message: string) => persist("debug", message),
	error: (message: string) => persist("error", message),
};

export default logger;

declare global {
	interface Console {
		_raw_log: (...parts: unknown[]) => void;
		_raw_warn: (...parts: unknown[]) => void;
		_raw_debug: (...parts: unknown[]) => void;
		_raw_error: (...parts: unknown[]) => void;
	}
}
