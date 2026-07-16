export interface CorsConfig {
	enabled: boolean;
	origins: string[];
	methods: string[];
	headers: string[];
	credentials: boolean;
}

export type AuthScheme = "bearer" | "header";

export interface AuthConfig {
	enabled: boolean;
	scheme: AuthScheme;
	header: string;
	tokens: string[];
	public_paths: string[];
}

export type RateLimitScope = "ip" | "global";

export interface RateLimitConfig {
	enabled: boolean;
	window: string;
	max: number;
	scope: RateLimitScope;
	public_paths: string[];
}

export type RuleField = "path" | "method" | "ip" | "header" | "query" | "user_agent";

export type RuleOperator = "equals" | "not_equals" | "starts_with" | "in" | "not_in" | "matches";

export interface RuleCondition {
	field: RuleField;
	key?: string;
	operator: RuleOperator;
	value: string | string[];
}

export interface ServerRule {
	name: string;
	conditions: RuleCondition[];
	action: "deny" | "allow";
	status?: number;
	message?: string;
}

export interface ServerConfig {
	enabled: boolean;
	host: string;
	port: number;
	prefix: string;
	trust_proxy: boolean;
	expose_errors: boolean;
	cors: CorsConfig;
	auth: AuthConfig;
	rate_limit: RateLimitConfig;
	rules: ServerRule[];
}
