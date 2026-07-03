export type Runtime = "bun" | "node" | "deno" | "unknown";

export function runtime(): Runtime {
	const scope = globalThis as { Bun?: unknown; Deno?: unknown };
	if (scope.Bun !== undefined) return "bun";
	if (scope.Deno !== undefined) return "deno";
	if (typeof process !== "undefined" && process.versions?.node !== undefined) return "node";
	return "unknown";
}

export function package_manager(): string {
	const agent = process.env.npm_config_user_agent;
	if (agent === undefined || agent.length === 0) return runtime() === "bun" ? "bun" : "npm";
	return agent.split("/")[0] ?? "npm";
}

export function has_module(name: string): boolean {
	try {
		const resolver = (import.meta as { resolve?: (id: string) => string }).resolve;
		if (resolver === undefined) return false;
		resolver(name);
		return true;
	} catch {
		return false;
	}
}
