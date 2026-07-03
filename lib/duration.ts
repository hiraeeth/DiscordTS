const UNIT_MS: Record<string, number> = {
	ms: 1,
	msec: 1,
	msecs: 1,
	millisecond: 1,
	milliseconds: 1,
	s: 1000,
	sec: 1000,
	secs: 1000,
	second: 1000,
	seconds: 1000,
	m: 60_000,
	min: 60_000,
	mins: 60_000,
	minute: 60_000,
	minutes: 60_000,
	h: 3_600_000,
	hr: 3_600_000,
	hrs: 3_600_000,
	hour: 3_600_000,
	hours: 3_600_000,
	d: 86_400_000,
	day: 86_400_000,
	days: 86_400_000,
	w: 604_800_000,
	week: 604_800_000,
	weeks: 604_800_000,
};

const TOKEN = /(\d+(?:\.\d+)?)\s*([a-z]+)/g;

export function parse_duration(input: string | number): number | null {
	if (typeof input === "number") return Number.isFinite(input) ? input : null;

	const text = input.trim().toLowerCase();
	if (text.length === 0) return null;
	if (/^\d+$/.test(text)) return Number(text);

	let total = 0;
	let matched = false;
	for (const [, amount, unit] of text.matchAll(TOKEN)) {
		const size = UNIT_MS[unit];
		if (size === undefined) return null;
		total += Number(amount) * size;
		matched = true;
	}

	if (!matched) return null;
	if (text.replace(TOKEN, "").trim().length > 0) return null;
	return total;
}

const STEPS: { size: number; label: string }[] = [
	{ size: 604_800_000, label: "w" },
	{ size: 86_400_000, label: "d" },
	{ size: 3_600_000, label: "h" },
	{ size: 60_000, label: "m" },
	{ size: 1000, label: "s" },
];

export function format_duration(ms: number, options: { units?: number } = {}): string {
	if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`;

	const parts: string[] = [];
	let remaining = Math.floor(ms / 1000) * 1000;
	for (const step of STEPS) {
		if (remaining < step.size) continue;
		const value = Math.floor(remaining / step.size);
		remaining -= value * step.size;
		parts.push(`${value}${step.label}`);
	}

	return parts.slice(0, options.units ?? parts.length).join(" ");
}
