# Coding rules: Discord.js + TypeScript bot

Every rule here is a hard constraint. If code you are about to return breaks one, it is wrong; fix it first. When rules conflict: structure beats naming, naming beats style, security beats optimization, logging beats brevity; otherwise the stricter rule wins. See `context.md` for how the framework is built and `tests.md` for testing.

## No comments: verify before every response

Ship zero comments. This is the rule that gets broken most, so scan your code for it before you return anything.

Forbidden, no exceptions, not even "for clarity":

- inline `// ...`
- block `/* ... */`
- JSDoc `/** ... */`
- doc banners, `TODO`, `FIXME`, `NOTE`
- divider comments like `// ---- helpers ----`
- leading path comments like `// lib/logger.ts`

If you reached for a comment to explain code, rename the thing or split the function instead. If you pass an existing comment while editing, delete it.

## One job per file

Each file fits one category. If it spans two, split it.

| File | Does | Never |
| --- | --- | --- |
| decorators / registry (`engine`) | register features and hold metadata | business logic, discord calls |
| base class (`engine/base`) | shared shape + `execute` contract for one kind | feature-specific logic |
| loader / dispatch (`engine`) | discover, mount, and route features | feature-specific logic |
| command (`app`) | one slash command `extends BaseCommand` | event/route wiring |
| event (`app`) | one gateway event `extends BaseEvent` | defining commands, http handlers |
| component (`app`) | one button/modal/select `extends *Component` | command registration |
| route (`app/routes`) | one `@Route` class `extends BaseRoute` with verb methods | discord command logic |
| logger / colors (`lib`) | one cross-cutting utility | feature logic |

Share logic the moment it repeats: generic helpers live in a base module; feature files import and extend them. Never duplicate near-identical logic across files. The engine loaders share one `scan`/`import_module` helper; extend it rather than re-walking the filesystem per kind.

## Naming

Everything you write is snake_case except the type system, which is PascalCase. Pick by what the identifier *is*, and never mix conventions within a file.

| Context | Convention |
| --- | --- |
| Local variables, function parameters, object keys you define | snake_case |
| Object/config fields you own (globals, metadata) | snake_case |
| Functions and class methods you write | snake_case |
| Classes, types, interfaces, enums, base classes, feature classes | PascalCase |
| Decorators (`@Command`, `@Event`, `@Register`, `@Route`) | PascalCase |
| Constants, env-derived statics | SCREAMING_SNAKE_CASE |
| Discord.js and Elysia identifiers (methods, builders, types) | leave as the library ships them |
| Our own builders/classes that mirror or extend a discord.js API | match the library's convention (camelCase) |

- Descriptive, 4+ characters everywhere except the loop-index exception below.
- **Mirror the library at its seams.** When a class we own stands in for a discord.js one and users chain it the same way, its fluent methods take the library's naming so both read alike - `PrefixCommandBuilder` uses `setName` / `setDescription` / `addUser`, not `set_name`, exactly like `SlashCommandBuilder`. This overrides the snake_case rule for those methods only; private internals and everything that is genuinely our own surface (helper option objects like `user_id` / `on_end`, decorator options, context fields) stay snake_case.
- One word where possible; no clarity-reducing abbreviations (`msg`, `cfg`, `usr` are out; write `message`, `config`, `user`).
- Name a feature class for what it is, not its kind; the base class already says the kind (`Ping extends BaseCommand`, `Ready extends BaseEvent`, `MySelectMenu extends SelectComponent`).

### Loop and math indices: the only short-name exception

Inside a `for`, `while`, or a tight numeric/matrix computation you may use single-letter indices: `i`, `j`, `k`, `m`, `n`. Reach for them **only** as counters or coordinates, and only when the body is short enough to read at a glance.

- Allowed: `for (let i = 0; i < rows.length; i++)`, nested `j`/`k` for inner loops, `m`/`n` for dimensions in a math helper.
- Never use them as a real value: not for an interaction, a row, a column name, a client, or anything you pass to a function. The moment the thing has meaning, name it (`for (const command of commands)`).
- Prefer `map` / `filter` / `reduce` / `for...of` when they read clearer; the index exception is for when a raw counter is genuinely the cleanest form.

## Style

- `const` by default; `let` only when you must reassign. Never declare a placeholder to reassign later; use a ternary.
- Early returns; never `else` after a return. The interaction dispatcher should guard-and-return, not nest.
- Never rely on implicit truthiness for critical control flow; test explicitly (`value !== undefined`, `list.length > 0`, `channel !== null`).
- Avoid `any`. `tsconfig` has `noImplicitAny` off, but that is a migration crutch, not a license; infer or type explicitly. Component `execute` is already typed by its base class; commands receive a typed `CommandContext`; routes a typed `RouteContext`.
- `map` / `filter` / `reduce` over manual loops when it reads clearer.
- Inline anything used once; extract only when reused 2+ times.
- No catch-all or generic `lib` dumping ground; every file in `lib/` is one named capability.
- `switch` for many values of one variable; always handle the `default`.
- Tabs for indentation, double quotes for strings; Prettier and ESLint enforce this (`bun run format`, `bun run lint`).

```ts
import { SlashCommandBuilder } from "discord.js";
import { Command, BaseCommand, CommandContext } from "engine";

@Command({ cooldown: 5, guilds: ["*"] })
export default class Ping extends BaseCommand {
	data = new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!");

	async execute(context: CommandContext) {
		await context.interaction.reply("Pong!");
	}
}
```

## Errors and logging

- The engine already wraps every `execute` dispatch in `try/catch` and replies with an ephemeral error. Inside `execute`, still `try/catch` around every unsafe operation; never swallow an error silently.
- Surface interaction failures back to the user through `interaction.reply` / `followUp` (respecting `replied` / `deferred`), not an unhandled throw.
- `console` is patched at startup by `install_console()` in `@/lib/logger`. `console.log` / `debug` / `warn` persist to `logs/log_DD_MM_YY.log`; `console.error` persists to `logs/errors_DD_MM_YY.log` (ANSI stripped, timestamped). So a normal coloured `console.*` call is already both printed and recorded; do not pair it with a second `logger.*` call for the same event, or the line double-writes.
- Reach for the `logger` default export only when you want a file record without console output. Reach for `console._raw_log` / `_raw_warn` / `_raw_debug` / `_raw_error` only when you deliberately need console output that is *not* persisted.
- Colour comes from `@/lib/colors`; keep the plain message readable once ANSI is stripped.
- Never log a token, secret, or full env dump. `TOKEN` and `CLIENT_ID` come from `.env` and stay there.

## Security

- Secrets live in `.env` and are read via `process.env` at the edge through `engine/env.ts`. Never hardcode a token, client id, guild id, or channel id into a feature file.
- Treat every interaction payload, route request body, and gateway event as untrusted input; validate and narrow before use. Prefer a zod `schema` on routes.
- Route handlers are public HTTP: validate input, never echo internal errors, and never expose bot internals in a response body.

## Performance

- Reuse the shared `Client`, loaders, and logger; do not spin up a second client per call.
- Defer long interactions (`deferReply`) instead of blocking; respect cooldowns.
- Load feature directories once at startup; do not re-scan the filesystem per interaction.
- Avoid unnecessary abstractions; prefer the direct implementation.

## Workflow

- Dev: `bun run dev` (watch). Build: `bun run build` (type-check, then bundle to `dist/`). Run the bundle: `bun run start`. Register slash commands: `bun run deploy`. Shard in production: `bun run shard`. Format and lint: `bun run format`, `bun run lint`. Test: `bun test`. Type errors, lint errors, a failing build, failing tests, and unhandled rejections are all failures; fix them.
- CI lives in `.github/workflows/`: `ci.yml` formats, lints, builds, and tests every push and PR; `release.yml` cuts a `v{version}` GitHub release from `package.json` (or a `canary` prerelease) with the commit changelog. Keep both green.
- Change only what was asked. Do not refactor, move, or rename without being told.
- You may spawn exploration tasks to index files and find existing commands, events, components, and helpers before writing new code.
- Act when it is safe; ask only when blocked by missing data, safety, or irreversibility.

## When unsure where logic goes

Wraps the discord.js wrapper (decorator, base class, loader, dispatch, client, permissions, ui)? → engine. Handles a slash command? → `app/commands`. Reacts to a gateway event? → `app/events`. Handles a modal/button/select? → `app/components`. Serves HTTP? → `app/routes`. Cross-cutting helper? → `lib`. Configuration? → `config.ts`. Spans two? → split. Still unsure? → split.
