import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import fs from "fs";
import os from "os";
import path from "path";
import { MemoryStorage } from "@/lib/storage/memory";
import { JsonStorage } from "@/lib/storage/json";
import { runtime, package_manager } from "@/lib/runtime";

describe("MemoryStorage", () => {
	test("stores values isolated per namespace", () => {
		const adapter = new MemoryStorage();
		adapter.set("a", "x", 1);
		adapter.set("b", "x", 2);
		expect(adapter.get("a", "x")).toBe(1);
		expect(adapter.get("b", "x")).toBe(2);
		adapter.delete("a", "x");
		expect(adapter.has("a", "x")).toBe(false);
		expect(adapter.has("b", "x")).toBe(true);
	});

	test("exposes keys and all", () => {
		const adapter = new MemoryStorage();
		adapter.set("ns", "k1", "a");
		adapter.set("ns", "k2", "b");
		expect(adapter.keys("ns").sort()).toEqual(["k1", "k2"]);
		expect(adapter.all("ns")).toEqual({ k1: "a", k2: "b" });
	});
});

describe("JsonStorage", () => {
	const dir = path.join(os.tmpdir(), `json_storage_${process.pid}`);
	const file = path.join(dir, "ns.json");

	beforeEach(() => {
		process.env.DATA_DIR = dir;
		if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
	});

	afterAll(() => {
		if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
		delete process.env.DATA_DIR;
	});

	test("persists and reads back a value", () => {
		const storage = new JsonStorage();
		storage.set("ns", "answer", 42);
		expect(storage.get("ns", "answer")).toBe(42);
		expect(fs.existsSync(file)).toBe(true);
	});

	test("writes atomically, leaving no temp files behind", () => {
		const storage = new JsonStorage();
		storage.set("ns", "key", "value");
		const leftovers = fs.readdirSync(dir).filter((entry) => entry.includes(".tmp"));
		expect(leftovers).toEqual([]);
	});

	test("a second instance sees a committed write", () => {
		const writer = new JsonStorage();
		const reader = new JsonStorage();
		expect(reader.get("ns", "key")).toBeUndefined();
		writer.set("ns", "key", "shared");
		expect(reader.get("ns", "key")).toBe("shared");
	});

	test("re-reads when the file changes underneath a cached instance", () => {
		const writer = new JsonStorage();
		const reader = new JsonStorage();
		writer.set("ns", "key", "first");
		expect(reader.get("ns", "key")).toBe("first");

		writer.set("ns", "key", "second");
		fs.utimesSync(file, new Date(), new Date(Date.now() + 1000));
		expect(reader.get("ns", "key")).toBe("second");
	});

	test("quarantines a corrupt file instead of silently resetting", () => {
		fs.mkdirSync(dir, { recursive: true });
		fs.writeFileSync(file, "{ not valid json");
		const storage = new JsonStorage();

		expect(storage.all("ns")).toEqual({});
		const preserved = fs.readdirSync(dir).filter((entry) => entry.endsWith(".corrupt"));
		expect(preserved.length).toBe(1);
		expect(fs.existsSync(file)).toBe(false);
	});
});

describe("runtime detection", () => {
	test("detects the bun runtime under bun test", () => {
		expect(runtime()).toBe("bun");
	});

	test("reports a package manager string", () => {
		expect(typeof package_manager()).toBe("string");
	});
});
