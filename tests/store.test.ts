import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import fs from "fs";
import os from "os";
import path from "path";
import { store } from "@/lib/store";

const dir = path.join(os.tmpdir(), `store_test_${process.pid}`);

describe("Store", () => {
	beforeEach(() => {
		process.env.DATA_DIR = dir;
		if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
	});

	afterAll(() => {
		if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
		delete process.env.DATA_DIR;
	});

	test("sets, reads, and deletes keys", () => {
		const settings = store<number>("settings");
		expect(settings.has("volume")).toBe(false);
		settings.set("volume", 7);
		expect(settings.get("volume")).toBe(7);
		expect(settings.has("volume")).toBe(true);
		settings.delete("volume");
		expect(settings.get("volume")).toBeUndefined();
	});

	test("persists to disk and reloads", () => {
		store<string>("greetings").set("en", "hello");
		const reopened = store<string>("greetings");
		expect(reopened.get("en")).toBe("hello");
		expect(fs.existsSync(path.join(dir, "greetings.json"))).toBe(true);
	});

	test("exposes keys and a snapshot of all entries", () => {
		const flags = store<boolean>("flags");
		flags.set("a", true);
		flags.set("b", false);
		expect(flags.keys().sort()).toEqual(["a", "b"]);
		expect(flags.all()).toEqual({ a: true, b: false });
	});
});
