import { describe, expect, test } from "bun:test";
import { evaluate_rules } from "@/engine/rules";
import type { RuleRequest } from "@/engine/rules";
import type { ServerRule } from "@/engine/server_config";

function make_request(overrides: Partial<RuleRequest> = {}): RuleRequest {
	return {
		path: "/api/health",
		method: "GET",
		ip: "1.2.3.4",
		user_agent: "curl/8",
		header: () => null,
		query: () => null,
		...overrides,
	};
}

describe("evaluate_rules", () => {
	test("returns null when no rule matches", () => {
		const rules: ServerRule[] = [{ name: "block-admin", conditions: [{ field: "path", operator: "starts_with", value: "/api/admin" }], action: "deny" }];
		expect(evaluate_rules(rules, make_request({ path: "/api/health" }))).toBeNull();
	});

	test("denies with the configured status and message on a match", () => {
		const rules: ServerRule[] = [{ name: "block-admin", conditions: [{ field: "path", operator: "starts_with", value: "/api/admin" }], action: "deny", status: 401, message: "No." }];
		const outcome = evaluate_rules(rules, make_request({ path: "/api/admin/x" }));
		expect(outcome).toEqual({ rule: "block-admin", status: 401, message: "No." });
	});

	test("defaults deny to 403 with a generic message", () => {
		const rules: ServerRule[] = [{ name: "deny-post", conditions: [{ field: "method", operator: "equals", value: "POST" }], action: "deny" }];
		expect(evaluate_rules(rules, make_request({ method: "POST" }))).toEqual({ rule: "deny-post", status: 403, message: "Forbidden." });
	});

	test("requires every condition to match (AND)", () => {
		const rules: ServerRule[] = [
			{
				name: "compound",
				conditions: [
					{ field: "method", operator: "equals", value: "DELETE" },
					{ field: "ip", operator: "not_in", value: ["9.9.9.9"] },
				],
				action: "deny",
			},
		];
		expect(evaluate_rules(rules, make_request({ method: "DELETE", ip: "1.1.1.1" }))).not.toBeNull();
		expect(evaluate_rules(rules, make_request({ method: "GET", ip: "1.1.1.1" }))).toBeNull();
	});

	test("an allow rule short-circuits later deny rules", () => {
		const rules: ServerRule[] = [
			{ name: "allow-loopback", conditions: [{ field: "ip", operator: "equals", value: "127.0.0.1" }], action: "allow" },
			{ name: "deny-all", conditions: [{ field: "path", operator: "starts_with", value: "/" }], action: "deny" },
		];
		expect(evaluate_rules(rules, make_request({ ip: "127.0.0.1" }))).toBeNull();
		expect(evaluate_rules(rules, make_request({ ip: "8.8.8.8" }))).not.toBeNull();
	});

	test("matches header and query fields by key", () => {
		const rules: ServerRule[] = [{ name: "bad-agent", conditions: [{ field: "header", key: "user-agent", operator: "equals", value: "evil" }], action: "deny" }];
		const request = make_request({ header: (name) => (name === "user-agent" ? "evil" : null) });
		expect(evaluate_rules(rules, request)).not.toBeNull();
	});

	test("a malformed regex never matches instead of throwing", () => {
		const rules: ServerRule[] = [{ name: "bad-regex", conditions: [{ field: "path", operator: "matches", value: "(" }], action: "deny" }];
		expect(evaluate_rules(rules, make_request())).toBeNull();
	});
});
