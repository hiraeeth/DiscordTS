function field_matches(field: string, value: number, min: number, max: number): boolean {
	if (field === "*") return true;

	for (const part of field.split(",")) {
		if (part.includes("/")) {
			const [range, step_text] = part.split("/");
			const step = Number(step_text);
			if (!Number.isInteger(step) || step <= 0) continue;
			const [low, high] = range === "*" ? [min, max] : range.includes("-") ? range.split("-").map(Number) : [Number(range), max];
			for (let n = low; n <= high; n += step) {
				if (n === value) return true;
			}
			continue;
		}

		if (part.includes("-")) {
			const [low, high] = part.split("-").map(Number);
			if (value >= low && value <= high) return true;
			continue;
		}

		if (Number(part) === value) return true;
	}

	return false;
}

export function cron_matches(expression: string, date: Date): boolean {
	const fields = expression.trim().split(/\s+/);
	if (fields.length !== 5) return false;

	return (
		field_matches(fields[0], date.getMinutes(), 0, 59) &&
		field_matches(fields[1], date.getHours(), 0, 23) &&
		field_matches(fields[2], date.getDate(), 1, 31) &&
		field_matches(fields[3], date.getMonth() + 1, 1, 12) &&
		field_matches(fields[4], date.getDay(), 0, 6)
	);
}

const FIELD_BOUNDS: [number, number][] = [
	[0, 59],
	[0, 23],
	[1, 31],
	[1, 12],
	[0, 6],
];

function valid_number(text: string, min: number, max: number): boolean {
	if (!/^\d+$/.test(text)) return false;
	const value = Number(text);
	return value >= min && value <= max;
}

function valid_field(field: string, min: number, max: number): boolean {
	if (field === "*") return true;

	for (const part of field.split(",")) {
		if (part.length === 0) return false;

		if (part.includes("/")) {
			const [range, step_text] = part.split("/");
			if (!/^\d+$/.test(step_text) || Number(step_text) <= 0) return false;
			if (range === "*") continue;
			const bounds = range.includes("-") ? range.split("-") : [range];
			if (!bounds.every((entry) => valid_number(entry, min, max))) return false;
			continue;
		}

		if (part.includes("-")) {
			if (!part.split("-").every((entry) => valid_number(entry, min, max))) return false;
			continue;
		}

		if (!valid_number(part, min, max)) return false;
	}

	return true;
}

export function validate_cron(expression: string): boolean {
	const fields = expression.trim().split(/\s+/);
	if (fields.length !== 5) return false;
	return fields.every((field, index) => valid_field(field, FIELD_BOUNDS[index][0], FIELD_BOUNDS[index][1]));
}
