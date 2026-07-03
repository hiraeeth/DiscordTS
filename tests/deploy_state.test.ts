import { describe, expect, test } from "bun:test";
import { command_signature, hash } from "@/engine/deploy_state";

describe("command_signature", () => {
	test("is a deterministic hex string", () => {
		const first = command_signature();
		const second = command_signature();
		expect(first).toBe(second);
		expect(first).toMatch(/^[0-9a-f]+$/);
	});
});

describe("hash", () => {
	test("is deterministic and hex", () => {
		expect(hash("abc")).toBe(hash("abc"));
		expect(hash("abc")).toMatch(/^[0-9a-f]+$/);
	});

	test("distinguishes different inputs", () => {
		expect(hash("commands-v1")).not.toBe(hash("commands-v2"));
	});
});
