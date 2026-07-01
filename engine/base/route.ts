import type { Client } from "discord.js";
import type { ZodType } from "zod";

export interface ResponseControls {
	status?: number | string;
	headers: Record<string, string>;
}

export interface RouteContext<Params = Record<string, string>, Body = unknown> {
	client: Client;
	request: Request;
	params: Params;
	query: Record<string, string | undefined>;
	body: Body;
	set: ResponseControls;
}

export type Verb = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface RouteSchema {
	body?: ZodType;
	query?: ZodType;
	params?: ZodType;
}

export type RouteSchemas = Partial<Record<Verb, RouteSchema>>;

export abstract class BaseRoute {
	client!: Client;
	schema?: RouteSchemas;

	GET?(context: RouteContext): unknown;
	POST?(context: RouteContext): unknown;
	PUT?(context: RouteContext): unknown;
	PATCH?(context: RouteContext): unknown;
	DELETE?(context: RouteContext): unknown;
	HEAD?(context: RouteContext): unknown;
	OPTIONS?(context: RouteContext): unknown;
}
