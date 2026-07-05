---
name: new-route
description: Scaffold an HTTP API route in app/routes on the Elysia server. Use when asked to add an HTTP endpoint, REST route, or webhook receiver.
---

# New HTTP route

1. Read `.agents/context.md` (HTTP routes section) if not already loaded.
2. Create `app/routes/<name>.ts`. The URL comes from `@Route(pattern)`, not the file path: `[id]` is a dynamic segment, `[...path]` a catch-all.
3. Default-export a PascalCase class extending `BaseRoute` with one async method per HTTP verb (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`).

```ts
import { Route, BaseRoute, RouteContext, RouteSchemas, z } from "engine";

@Route("/guilds/[id]")
export default class GuildInfo extends BaseRoute {
	schema: RouteSchemas = {
		GET: { params: z.object({ id: z.string().regex(/^\d+$/) }) },
	};

	async GET({ params, set }: RouteContext<{ id: string }>) {
		const guild = this.client.guilds.cache.get(params.id);
		if (guild === undefined) {
			set.status = 404;
			return { error: "Guild not found" };
		}
		return { id: guild.id, name: guild.name, members: guild.memberCount };
	}
}
```

## Rules

- Validate input with a zod `schema` field per verb (`body`, `query`, `params`); the engine returns a structured 400 on failure. `z` is re-exported from `"engine"`.
- Auth, rate limiting, CORS, and request rules are enforced centrally from `config.server`; never re-implement them in a route. Opt out per route with `auth = false` or `rate_limit = false | { window, max }` only when explicitly required.
- Routes are public HTTP: treat everything as untrusted, never echo internal errors, never expose bot internals or secrets in a response body.
- The server only starts when `config.server.enabled` is true, mounted under `config.server.prefix`. Do not stand up a second server or use express.
- No comments, snake_case locals; verb methods keep their uppercase names.

## Verify

Add or extend an integration test in `tests/` driving the route with `app.handle(new Request(...))` (see `.agents/tests.md`), then run `bun test`, `bun run typecheck`, and `bun run lint`.
