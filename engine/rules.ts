import type { RuleCondition, ServerRule } from "./server_config";

export interface RuleRequest {
	path: string;
	method: string;
	ip: string;
	user_agent: string;
	header: (name: string) => string | null;
	query: (name: string) => string | null;
}

export interface RuleOutcome {
	rule: string;
	status: number;
	message: string;
}

const regex_cache = new Map<string, RegExp | null>();

function compile(pattern: string): RegExp | null {
	const cached = regex_cache.get(pattern);
	if (cached !== undefined) return cached;

	let compiled: RegExp | null;
	try {
		compiled = new RegExp(pattern);
	} catch {
		compiled = null;
	}
	regex_cache.set(pattern, compiled);
	return compiled;
}

function as_list(value: string | string[]): string[] {
	return Array.isArray(value) ? value : [value];
}

function field_value(request: RuleRequest, condition: RuleCondition): string {
	switch (condition.field) {
		case "path":
			return request.path;
		case "method":
			return request.method;
		case "ip":
			return request.ip;
		case "user_agent":
			return request.user_agent;
		case "header":
			return (condition.key !== undefined ? request.header(condition.key) : null) ?? "";
		case "query":
			return (condition.key !== undefined ? request.query(condition.key) : null) ?? "";
		default:
			return "";
	}
}

function condition_matches(actual: string, condition: RuleCondition): boolean {
	switch (condition.operator) {
		case "equals":
			return actual === String(condition.value);
		case "not_equals":
			return actual !== String(condition.value);
		case "starts_with":
			return actual.startsWith(String(condition.value));
		case "in":
			return as_list(condition.value).includes(actual);
		case "not_in":
			return !as_list(condition.value).includes(actual);
		case "matches": {
			const pattern = compile(String(condition.value));
			return pattern !== null && pattern.test(actual);
		}
		default:
			return false;
	}
}

export function evaluate_rules(rules: ServerRule[], request: RuleRequest): RuleOutcome | null {
	for (const rule of rules) {
		const matched = rule.conditions.every((condition) => condition_matches(field_value(request, condition), condition));
		if (!matched) continue;
		if (rule.action === "allow") return null;
		return { rule: rule.name, status: rule.status ?? 403, message: rule.message ?? "Forbidden." };
	}
	return null;
}
