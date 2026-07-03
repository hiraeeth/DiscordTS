export interface ColorParts {
	r: number;
	g: number;
	b: number;
	a?: number;
}

export type ColorInput = string | number | Color | ColorParts;

export class Color {
	readonly r: number;
	readonly g: number;
	readonly b: number;
	readonly a: number;

	constructor(r: number, g: number, b: number, a = 255) {
		this.r = channel(r);
		this.g = channel(g);
		this.b = channel(b);
		this.a = channel(a);
	}

	get red(): number {
		return this.r;
	}

	get green(): number {
		return this.g;
	}

	get blue(): number {
		return this.b;
	}

	get alpha(): number {
		return this.a;
	}

	get int(): number {
		return (this.r << 16) | (this.g << 8) | this.b;
	}

	get hex(): string {
		return `#${to_hex(this.r)}${to_hex(this.g)}${to_hex(this.b)}`;
	}

	get hexa(): string {
		return `#${to_hex(this.r)}${to_hex(this.g)}${to_hex(this.b)}${to_hex(this.a)}`;
	}

	get rgb(): { r: number; g: number; b: number } {
		return { r: this.r, g: this.g, b: this.b };
	}

	get rgba(): { r: number; g: number; b: number; a: number } {
		return { r: this.r, g: this.g, b: this.b, a: this.a };
	}

	get hsl(): { h: number; s: number; l: number } {
		return rgb_to_hsl(this.r, this.g, this.b);
	}

	get hsla(): { h: number; s: number; l: number; a: number } {
		return { ...rgb_to_hsl(this.r, this.g, this.b), a: this.a };
	}

	get css(): string {
		return `rgba(${this.r}, ${this.g}, ${this.b}, ${Number((this.a / 255).toFixed(3))})`;
	}

	with(parts: Partial<ColorParts>): Color {
		return new Color(parts.r ?? this.r, parts.g ?? this.g, parts.b ?? this.b, parts.a ?? this.a);
	}

	equals(other: Color): boolean {
		return this.r === other.r && this.g === other.g && this.b === other.b && this.a === other.a;
	}

	valueOf(): number {
		return this.int;
	}

	toJSON(): number {
		return this.int;
	}

	toString(): string {
		return this.hex;
	}

	static from(...args: ColorInput[]): Color {
		return build(args);
	}

	static rgb(r: number, g: number, b: number): Color {
		return new Color(r, g, b, 255);
	}

	static rgba(r: number, g: number, b: number, a: number): Color {
		return new Color(r, g, b, a);
	}

	static hsl(h: number, s: number, l: number): Color {
		return from_hsl(h, s, l, 255);
	}

	static hsla(h: number, s: number, l: number, a: number): Color {
		return from_hsl(h, s, l, a);
	}

	static hex(value: string): Color {
		return parse_hex(value);
	}

	static int(value: number): Color {
		return from_int(value);
	}
}

export function color(value: ColorInput): Color;
export function color(r: number, g: number, b: number): Color;
export function color(r: number, g: number, b: number, a: number): Color;
export function color(...args: ColorInput[]): Color {
	return build(args);
}

export function rgb(r: number, g: number, b: number): Color {
	return new Color(r, g, b, 255);
}

export function rgba(r: number, g: number, b: number, a: number): Color {
	return new Color(r, g, b, a);
}

export function hsl(h: number, s: number, l: number): Color {
	return from_hsl(h, s, l, 255);
}

export function hsla(h: number, s: number, l: number, a: number): Color {
	return from_hsl(h, s, l, a);
}

export function hex(value: string): Color {
	return parse_hex(value);
}

function build(args: ColorInput[]): Color {
	if (args.length === 0) return new Color(0, 0, 0, 255);

	const [first, ...rest] = args;
	if (first instanceof Color) return new Color(first.r, first.g, first.b, first.a);

	if (typeof first === "number") {
		if (rest.length === 0) return from_int(first);
		const numbers = [first, ...rest] as number[];
		return new Color(numbers[0], numbers[1], numbers[2], numbers[3] ?? 255);
	}

	if (typeof first === "string") return parse_string(first);
	return new Color(first.r, first.g, first.b, first.a ?? 255);
}

function parse_string(value: string): Color {
	const trimmed = value.trim();
	const lower = trimmed.toLowerCase();
	if (lower.startsWith("rgb")) return parse_rgb(trimmed);
	if (lower.startsWith("hsl")) return parse_hsl(trimmed);
	if (lower.startsWith("#") || lower.startsWith("0x")) return parse_hex(trimmed);
	if (/^[0-9a-f]{3,8}$/i.test(trimmed)) return parse_hex(trimmed);
	throw new Error(`Unrecognised color: ${value}`);
}

function parse_hex(value: string): Color {
	let raw = value.trim();
	if (raw.startsWith("#")) raw = raw.slice(1);
	else if (raw.startsWith("0x") || raw.startsWith("0X")) raw = raw.slice(2);
	if (raw.length === 3 || raw.length === 4)
		raw = raw
			.split("")
			.map((piece) => piece + piece)
			.join("");
	if (raw.length !== 6 && raw.length !== 8) throw new Error(`Invalid hex color: ${value}`);

	const r = Number.parseInt(raw.slice(0, 2), 16);
	const g = Number.parseInt(raw.slice(2, 4), 16);
	const b = Number.parseInt(raw.slice(4, 6), 16);
	const a = raw.length === 8 ? Number.parseInt(raw.slice(6, 8), 16) : 255;
	if ([r, g, b, a].some((part) => Number.isNaN(part))) throw new Error(`Invalid hex color: ${value}`);
	return new Color(r, g, b, a);
}

function parse_rgb(value: string): Color {
	const numbers = value.match(/[\d.]+/g);
	if (numbers === null || numbers.length < 3) throw new Error(`Invalid rgb color: ${value}`);
	const alpha = numbers.length >= 4 ? Number(numbers[3]) * 255 : 255;
	return new Color(Number(numbers[0]), Number(numbers[1]), Number(numbers[2]), alpha);
}

function parse_hsl(value: string): Color {
	const numbers = value.match(/[\d.]+/g);
	if (numbers === null || numbers.length < 3) throw new Error(`Invalid hsl color: ${value}`);
	const alpha = numbers.length >= 4 ? Number(numbers[3]) * 255 : 255;
	return from_hsl(Number(numbers[0]), Number(numbers[1]), Number(numbers[2]), alpha);
}

function from_int(value: number): Color {
	const n = Math.trunc(value) & 0xffffff;
	return new Color((n >> 16) & 255, (n >> 8) & 255, n & 255, 255);
}

function from_hsl(h: number, s: number, l: number, a: number): Color {
	const { r, g, b } = hsl_to_rgb(h, clamp01(s / 100), clamp01(l / 100));
	return new Color(r, g, b, a);
}

function hsl_to_rgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
	const hue = (((h % 360) + 360) % 360) / 360;
	if (s === 0) {
		const value = l * 255;
		return { r: value, g: value, b: value };
	}

	const peak = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const base = 2 * l - peak;
	return {
		r: channel_from_hue(base, peak, hue + 1 / 3) * 255,
		g: channel_from_hue(base, peak, hue) * 255,
		b: channel_from_hue(base, peak, hue - 1 / 3) * 255,
	};
}

function channel_from_hue(base: number, peak: number, fraction: number): number {
	let point = fraction;
	if (point < 0) point += 1;
	if (point > 1) point -= 1;
	if (point < 1 / 6) return base + (peak - base) * 6 * point;
	if (point < 1 / 2) return peak;
	if (point < 2 / 3) return base + (peak - base) * (2 / 3 - point) * 6;
	return base;
}

function rgb_to_hsl(red: number, green: number, blue: number): { h: number; s: number; l: number } {
	const r = red / 255;
	const g = green / 255;
	const b = blue / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const lightness = (max + min) / 2;

	if (max === min) return { h: 0, s: 0, l: Math.round(lightness * 100) };

	const delta = max - min;
	const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
	let hue: number;
	if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
	else if (max === g) hue = (b - r) / delta + 2;
	else hue = (r - g) / delta + 4;
	hue /= 6;

	return { h: Math.round(hue * 360), s: Math.round(saturation * 100), l: Math.round(lightness * 100) };
}

function channel(value: number): number {
	return Math.max(0, Math.min(255, Math.round(value)));
}

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function to_hex(value: number): string {
	return value.toString(16).padStart(2, "0");
}
