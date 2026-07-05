---
name: new-task
description: Scaffold a scheduled task (cron or interval) in app/tasks. Use when asked to run something periodically, on a timer, or on a schedule.
---

# New scheduled task

1. Read `.agents/context.md` (Scheduled tasks section) if not already loaded.
2. Create `app/tasks/<name>.ts`.
3. Default-export a PascalCase class extending `BaseTask`, decorated with `@Cron("...")` or `@Interval("...")`; implement `execute()`.

```ts
import { Interval, BaseTask } from "engine";

@Interval("5m")
export default class Presence extends BaseTask {
	async execute() {
		this.client.user?.setActivity("with decorators");
	}
}
```

## Choosing the decorator

- `@Interval("30s" | "5m" | 60000)`: fires on a `setInterval`; accepts a `lib/duration` string or raw milliseconds.
- `@Cron("*/5 * * * *")`: a 5-field cron expression (`engine/cron.ts`), evaluated once per minute.

## Rules

- Never hand-roll a `setInterval` or `setTimeout` loop inside a command, event, or `index.ts`; declare a task instead.
- `this.client` is injected. Wrap unsafe work in `try/catch`; a crashing task must not take the process down.
- Tasks are per-process: under `bun run shard` every shard runs its own copy. Guard with a shard check if the work must run once cluster-wide.
- No comments, snake_case locals and methods.

## Verify

Run `bun run typecheck` and `bun run lint`. Tasks are live on next boot; no deploy step.
