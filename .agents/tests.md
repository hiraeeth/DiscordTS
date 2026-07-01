# Testing

Tests run on the Bun test runner. Files live in `tests/` as `*.test.ts`. Run them with `bun test`.

## What to test

- **Pure logic** with unit tests: the permission manager (`Permissions`), the Components V2 helpers (`container`, `section`, `view`), and any helper you add. Construct real inputs (`new PermissionsBitField(...)`) instead of mocking.
- **The HTTP API** with integration tests: enable it in `config.server`, call `load_routes("./app/routes")`, and drive the returned server with `app.handle(new Request(...))`. `handle` needs no bound port, so tests stay fast and CI-safe; call `app.stop()` in `afterAll`.
- Add a test alongside any new engine capability. A feature is not done until the behavior it introduces is covered.

## Rules

- Test real behavior, not restated logic. Never re-implement the thing under test inside the test.
- Do not mock what you can construct. Avoid stubbing discord.js internals; prefer real builders and requests.
- Import the unit under test directly (`@/engine/permissions`, `@/engine/ui`) to avoid pulling in the whole engine and its side effects when you only need one piece.
- Keep tests deterministic: no real network, no real Discord login, no reliance on wall-clock timing.

## Example

```ts
import { describe, expect, test } from "bun:test";
import { PermissionsBitField, PermissionFlagsBits } from "discord.js";
import { Permissions } from "@/engine/permissions";

describe("Permissions", () => {
	const bits = new PermissionsBitField(PermissionFlagsBits.ManageGuild);

	test("reports a granted permission", () => {
		expect(new Permissions(bits).has("ManageGuild")).toBe(true);
	});
});
```
