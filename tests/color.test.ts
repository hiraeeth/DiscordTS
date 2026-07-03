import { describe, expect, test } from "bun:test";
import { color, rgb, rgba, hsl, hex, Color } from "@/helpers/color";
import { embed } from "@/helpers/embeds";

describe("color factory", () => {
	test("parses short and long hex", () => {
		expect(hex("#fff").rgb).toEqual({ r: 255, g: 255, b: 255 });
		expect(color("#5865f2").int).toBe(0x5865f2);
		expect(color("#5865f2").hex).toBe("#5865f2");
	});

	test("parses 0x and bare hex", () => {
		expect(color("0x5865f2").int).toBe(0x5865f2);
		expect(color("5865f2").int).toBe(0x5865f2);
	});

	test("accepts an integer or rgb channels", () => {
		expect(color(0x5865f2).int).toBe(0x5865f2);
		expect(color(255, 0, 0).hex).toBe("#ff0000");
		expect(color(255, 255, 255, 128).a).toBe(128);
	});

	test("parses css rgb and rgba strings", () => {
		expect(color("rgb(255, 0, 0)").hex).toBe("#ff0000");
		expect(color("rgba(0, 0, 0, 0.5)").a).toBe(128);
	});

	test("parses and produces hsl", () => {
		expect(color("hsl(120, 100%, 50%)").rgb).toEqual({ r: 0, g: 255, b: 0 });
		expect(hsl(0, 100, 50).rgb).toEqual({ r: 255, g: 0, b: 0 });
		expect(color(0, 255, 0).hsl).toEqual({ h: 120, s: 100, l: 50 });
	});
});

describe("color accessors", () => {
	const value = rgba(16, 32, 48, 200);

	test("expose channel aliases", () => {
		expect(value.r).toBe(16);
		expect(value.red).toBe(16);
		expect(value.green).toBe(32);
		expect(value.blue).toBe(48);
		expect(value.alpha).toBe(200);
	});

	test("clamp out-of-range channels", () => {
		expect(rgb(-40, 999, 128).rgb).toEqual({ r: 0, g: 255, b: 128 });
	});

	test("coerce to its integer and hex forms", () => {
		expect(value.valueOf()).toBe(value.int);
		expect(`${rgb(255, 0, 0)}`).toBe("#ff0000");
		expect(rgba(255, 255, 255, 128).hexa).toBe("#ffffff80");
	});

	test("build a derived color with with()", () => {
		expect(rgb(10, 20, 30).with({ r: 200 }).rgb).toEqual({ r: 200, g: 20, b: 30 });
	});

	test("from() is polymorphic", () => {
		expect(Color.from("#fff").equals(rgb(255, 255, 255))).toBe(true);
		expect(Color.from({ r: 1, g: 2, b: 3 }).rgb).toEqual({ r: 1, g: 2, b: 3 });
	});
});

describe("color integrates with embeds", () => {
	test("resolves a Color into the embed colour int", () => {
		expect(embed({ color: rgb(255, 0, 0) }).toJSON().color).toBe(0xff0000);
		expect(embed({ color: color("#00ff00") }).toJSON().color).toBe(0x00ff00);
	});
});
