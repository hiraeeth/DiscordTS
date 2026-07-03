# Discord Bot Template (TypeScript)

A decorator-driven Discord bot template built with **TypeScript**, **discord.js v14**, and **Bun**. You write small feature classes, drop them in a folder, and the engine discovers, instantiates, injects the client, and wires them at startup. No manual registration, no database, no boilerplate to maintain.

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

That is a complete, working command. Save it under `app/commands/` and it is live on the next boot.

## Highlights

- **Decorator-driven.** `@Command`, `@ContextMenu`, `@Prefix`, `@Event`, `@Cron`, `@Interval`, `@Register`, `@Route` - declare a class, drop the file, done.
- **Slash + text + context-menu commands**, subcommand routing, and autocomplete.
- **Guards and scoped cooldowns** run before every handler (`owner_only`, `has_perms(...)`, custom functions; per user/guild/channel/global).
- **Typed permissions**, channel-aware, with autocompleting permission names.
- **Batteries-included UI**: Components V2 helpers, embeds, pagination, interactive settings panels, confirm/alert dialogs, and modal forms.
- **Pluggable storage** (JSON / memory / your own adapter), per-guild prefixes, i18n, duration parsing, and a scoped cooldown manager.
- **Optional HTTP API** on Elysia with a Next.js-style router - **secure by default**: token auth, rate limiting, CORS, and a declarative rule engine.
- **Scheduled tasks** via cron expressions or intervals.
- **AI-agent friendly**: the whole architecture and coding rules are documented in `.agents/` for assistants like Claude Code (see [Built for AI agents](#built-for-ai-agents)).

## Requirements

- [Bun](https://bun.sh) 1.1 or newer
- A Discord application with a bot token and client id

## Quick start

```bash
bun install                 # install dependencies
cp .env.example .env        # then fill in your credentials
bun run deploy              # register slash/context-menu commands with Discord
bun run dev                 # run with hot reload
```

Your `.env`:

```
TOKEN=your_bot_token
CLIENT_ID=your_application_id
OWNERS=comma,separated,user,ids     # optional, powers the owner_only guard
API_TOKENS=comma,separated,tokens   # optional, only needed if you enable the HTTP API
```

Re-run `bun run deploy` whenever you add or change a command's name, description, options, or guild scope.

## Project structure

```
engine/          the discord.js wrapper - you rarely touch this
  decorators.ts    @Command, @ContextMenu, @Prefix, @Event, @Cron, @Interval, @Register, @Route
  base/            the base classes you extend
  loaders/         discovery + mounting, one loader per feature kind
  dispatch.ts      interaction router (guards, cooldowns, error replies)
  prefix_dispatch.ts   MessageCreate router for prefix commands
  guards.ts        precondition guards
  rules.ts         declarative HTTP request rules
  ui.ts            Components V2 builder helpers
  permissions.ts   typed permission manager

app/             your features - this is where you work
  commands/        slash commands, grouped in subfolders
  context/         context-menu commands
  prefixes/        text (prefix) commands
  events/          gateway event handlers
  tasks/           scheduled tasks (cron / interval)
  components/      button, modal, and select handlers
  routes/          HTTP API routes

helpers/         embeds, pagination, panel, dialog, form, color
lib/             logger, colors, storage, cooldowns, prefixes, duration, i18n, ratelimit, runtime
config.ts        central configuration
index.ts         entrypoint: installs the console patch and boots the engine
.agents/         architecture + coding rules for AI assistants
```

You only edit files under `app/`, `helpers/` (if extending), `lib/` (for new capabilities), and `config.ts`. Everything in `engine/` is the framework.

## Built for AI agents

This template is designed to be handed to an AI coding assistant (Claude Code, Cursor, etc.) with minimal ramp-up. The conventions live in version-controlled Markdown that agents read automatically:

| File | Purpose |
| --- | --- |
| `AGENTS.md` | Entry point. A short overview that pulls in the three docs below. |
| `CLAUDE.md` | Claude Code entry point - imports `AGENTS.md`. |
| `.agents/context.md` | **Architecture & public surface.** How the engine wires features, every decorator and base class, the config shape, and where each kind of logic belongs. |
| `.agents/agents.md` | **Coding rules.** Hard constraints: no comments, one job per file, snake_case (PascalCase for types), early returns, error handling, security, and the file-placement decision tree. |
| `.agents/tests.md` | **Testing guide.** What to test, how to drive the HTTP API without a port, and the Bun test-runner conventions. |

If you use another tool, point it at `AGENTS.md`. Keeping these accurate is part of the workflow - when you change the framework surface, update `.agents/context.md` in the same change.

## Feature classes

Every mountable feature is a `default export class` that extends a base class and carries a decorator. The base class injects `this.client` and fixes the `execute` signature; the decorator supplies registration metadata.

### Commands

Extend `BaseCommand`, set a `SlashCommandBuilder` on `data`, implement `execute`.

```ts
@Command({ cooldown: 5, cooldown_scope: "user", guilds: ["*"] })
export default class Ping extends BaseCommand {
	data = new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!");

	async execute(context: CommandContext) {
		await context.interaction.reply("Pong!");
	}
}
```

- `cooldown` is in seconds; `cooldown_scope` is `"user"` (default), `"guild"`, `"channel"`, or `"global"`.
- `guilds` is a list of guild ids, or `["*"]` to register globally. Omitted options fall back to `config.commands`.
- `context` gives you `client`, `interaction`, `permissions`, `globals`, and command metadata.
- Per-command shared state goes in a `globals` field and is exposed on `context.globals`.

**Subcommands** - set a `subcommands` map and call `this.run_subcommands(context)` instead of a hand-written switch:

```ts
subcommands: Subcommands = {
	status: (context) => this.status(context),
	"config/set": (context) => this.set(context),
};

async execute(context: CommandContext) {
	await this.run_subcommands(context);
}
```

**Autocomplete** - implement an optional `autocomplete(interaction)`; the engine routes focused-option interactions to it (and runs the command's guards first).

### Context-menu commands

Right-click commands on users or messages. Extend `BaseContextMenu`, set a `ContextMenuCommandBuilder`. Registered by `bun run deploy` alongside slash commands.

```ts
@ContextMenu({ guilds: ["*"] })
export default class Avatar extends BaseContextMenu {
	data = new ContextMenuCommandBuilder().setName("Avatar").setType(ApplicationCommandType.User);

	async execute(context: ContextMenuContext) {
		if (!context.interaction.isUserContextMenuCommand()) return;
		await context.interaction.reply(context.interaction.targetUser.displayAvatarURL());
	}
}
```

### Prefix commands

Text commands (`.ping`) driven off `MessageCreate` - an alternative to slash commands. Extend `BasePrefixCommand`, describe the command with `PrefixCommandBuilder`, and read typed args off `context.args`.

```ts
@Prefix({ cooldown: 3, guilds: ["*"] })
export default class Avatar extends BasePrefixCommand {
	data = new PrefixCommandBuilder()
		.setName("avatar")
		.setDescription("Show a user's avatar.")
		.addAlias("av")
		.addUser("target", "Whose avatar to show");

	async execute(context: PrefixContext) {
		const user = (context.args.target as User) ?? context.message.author;
		await context.message.reply(user.displayAvatarURL());
	}
}
```

The prefix is per-guild: it defaults to `config.prefix.default`, can be changed at runtime (persisted to storage), and - when `config.prefix.allow_mention` is on - `@bot` also works as a prefix. The whole subsystem is gated by `config.prefix.enabled`. The builder mirrors discord.js's `SlashCommandBuilder` naming: `setName`, `setDescription`, `addAlias`, and typed `addString` / `addInteger` / `addNumber` / `addBoolean` / `addUser` / `addMember` / `addChannel` / `addRole` / `addRest`.

### Events

Extend `BaseEvent`, carry `@Event(name, { once? })` where `name` is a discord.js `Events` value.

```ts
@Event(Events.ClientReady, { once: true })
export default class Ready extends BaseEvent {
	async execute(client: Client) {
		console.log(`${client.user?.username} is online.`);
	}
}
```

You never write an `InteractionCreate` or `MessageCreate` handler to route commands - the engine owns that.

### Scheduled tasks

Extend `BaseTask` and carry `@Cron("*/5 * * * *")` (5-field cron, evaluated each minute) or `@Interval("30s")` (a duration string or raw ms). Never hand-roll a `setInterval` in a feature.

```ts
@Interval("30s")
export default class Presence extends BaseTask {
	async execute() {
		this.client.user?.setActivity(`${this.client.guilds.cache.size} servers`);
	}
}
```

### Components

Handlers for buttons, modals, and select menus. Extend the matching base class, register with `@Register(id, options?)`, implement `execute`. The `id` matches the `customId` you send.

```ts
@Register("panel_button", { cooldown: 3 })
export default class PanelButton extends ButtonComponent {
	async execute(interaction: ButtonInteraction) {
		await interaction.reply("You clicked the button!");
	}
}
```

- Base classes: `ButtonComponent`, `ModalComponent`, `SelectComponent` (any select), and the typed `StringSelectComponent` / `UserSelectComponent` / `RoleSelectComponent` / `ChannelSelectComponent` / `MentionableSelectComponent`.
- `@Register` accepts `{ cooldown?, cooldown_scope?, guards? }` - the same guard + cooldown pipeline as commands runs before `execute`.
- **Dynamic custom ids**: routing uses the segment before the first `:`, so a button with `customId` `"vote:up:<messageAuthorId>"` still routes to the `vote` handler, which reads the rest off `interaction.customId`. Because a persistent component cannot know who is allowed to click it, this is how you lock one to its invoker - encode the allowed user id and reject others in `execute`. (The collector-based helpers below handle per-user locking for you.)

## Guards and cooldowns

Both dispatchers run the same pipeline before `execute`: **guards**, then **cooldown**.

```ts
import { Command, BaseCommand, CommandContext, in_guild, has_perms } from "engine";

@Command({ cooldown: 10, guards: [in_guild, has_perms("ManageGuild")] })
export default class Guarded extends BaseCommand {
	data = new SlashCommandBuilder().setName("guarded").setDescription("Managers only, once every 10s.");

	async execute(context: CommandContext) {
		await context.interaction.reply("You passed the guards.");
	}
}
```

A guard is `(context) => true | string | Promise<...>` - return `true` to pass, or a message shown to the user on denial. Built-ins: `owner_only`, `in_guild`, `dm_only`, `nsfw_only`, `has_perms(...)`, `bot_has_perms(...)`. Write custom guards as plain functions and prefer them over ad-hoc `if` checks inside `execute`.

Cooldowns are in-memory and per-process - a best-effort courtesy limit, not a hard quota (under sharding each shard tracks its own, and they reset on restart). Prefix-command aliases share the command's canonical cooldown bucket.

## Permissions

Commands receive a ready `Permissions` instance on `context.permissions`, built from the invoking member and resolved against the current channel. Permission names are typed, so your editor autocompletes them and catches typos.

```ts
async execute(context: CommandContext) {
	if (!context.permissions.has("ManageGuild")) {
		await context.interaction.reply("You need the Manage Server permission.");
		return;
	}
	await context.interaction.reply("Welcome, moderator.");
}
```

Methods: `has`, `all`, `any`, `missing`. Build one anywhere with `new Permissions(holder)` where `holder` is a `GuildMember`, a `PermissionsBitField`, or `null` (a null holder returns `false` rather than throwing).

## Storage, i18n, and durations

- **Storage** - `store<T>(name)` from `@/lib/store` is a typed, namespaced facade (`get` / `set` / `has` / `delete` / `all` / `keys` / `clear` / `reload`) over the adapter selected by `config.storage.driver`: `"json"` (default; atomic writes, one `data/<name>.json` per namespace), `"memory"`, or `"custom"` (implement `StorageAdapter` to back it with SQLite, Redis, etc.). The JSON driver is single-process-preferred; multi-process deployments should use a database-backed custom adapter.
- **i18n** - `t(key, locale?, vars?)` resolves JSON catalogs under `locales/`, interpolates `{vars}`, and falls back to the key. Off by default via `config.localization.enabled`.
- **Durations** - `parse_duration("1h30m")` → ms (or `null`); `format_duration(ms)` → `"1m 30s"`. Underpins cooldowns, `@Interval`, and any timeout you expose.

## Building messages

### Components V2

`engine` exports snake_case helpers over Discord's Components V2 so you never touch raw flags or JSON. Wrap top-level components in `view(...)` and reply with the result.

```ts
import { view, container, text, separator, section, ButtonBuilder } from "engine";

const layout = container(
	text("## Components V2 panel"),
	separator(),
	section(["Press the button on the right."], new ButtonBuilder().setCustomId("panel_button").setLabel("Click me").setStyle(ButtonStyle.Primary))
);

await interaction.reply(view(layout));
```

Helpers: `container`, `section`, `text`, `separator`, `thumbnail`, `gallery`, `file`, `view`.

### Embeds and interactive helpers

Under `@/helpers/*`:

- **`embed(options)`** turns a plain object into an `EmbedBuilder`; `success` / `error` / `warning` / `info` / `neutral` are colour presets; `lines_to_pages` / `fields_to_pages` chunk data into pages.
- **`paginate(target, pages, options?)`** drives an `EmbedBuilder[]` with first/prev/next/last buttons; works with both slash interactions and messages, and locks to the invoker by default.
- **`panel(target, { settings, ... })`** renders an interactive settings panel (boolean / text / number / choice) backed by your own `get`/`set` callbacks.
- **`dialog` / `confirm` / `alert`** are button prompts; `confirm` resolves to a boolean.
- **`form(target, { fields })`** shows a modal and returns typed values.
- **`color(...)`** is a polymorphic colour value (hex / int / rgb / hsl / css) usable anywhere a helper takes a colour.

## HTTP API

An optional web layer on [Elysia](https://elysiajs.com) with a Next.js-style router. **Off by default** - set `config.server.enabled` to `true` to turn it on.

A route extends `BaseRoute`, carries `@Route(pattern)`, and implements one async method per HTTP verb. The pattern declares the URL: `[id]` is a dynamic segment, `[...name]` a catch-all. Set an optional zod `schema` to validate `body` / `query` / `params`; invalid requests get an automatic 400.

```ts
import { Route, BaseRoute, RouteContext, RouteSchemas, z } from "engine";

const body = z.object({ content: z.string() });

@Route("/guilds/[id]")
export default class GuildRoute extends BaseRoute {
	schema: RouteSchemas = { POST: { body } };

	async GET({ client, params }: RouteContext<{ id: string }>) {
		const guild = client.guilds.cache.get(params.id);
		return { id: params.id, name: guild ? guild.name : null };
	}

	async POST({ params, body }: RouteContext<{ id: string }, z.infer<typeof body>>) {
		return { id: params.id, content: body.content };
	}
}
```

Return a plain object to send JSON, or a `Response`. Every route mounts under `config.server.prefix` (default `/api`), so the example serves `GET /api/guilds/:id`. The engine adds a `/health` route, logs each request, and returns structured JSON for unknown routes.

### Security (declarative, enforced centrally)

All protection lives in `config.server` and is enforced in one place - never re-implement auth or rate limiting inside a route. The defaults are **secure-by-default** and only apply once the server is enabled:

- **`host: "127.0.0.1"`** - loopback only. Change it to expose the API off-box.
- **`auth`** - bearer-token (or custom-header) auth, tokens read from the `API_TOKENS` env var, constant-time compared. Missing/invalid → 401. `public_paths` defaults to `["/health"]`.
- **`rate_limit`** - fixed-window per-IP limiter; over the limit → 429 with `Retry-After`. In-process (per-shard under sharding).
- **`cors`** - an allowlist (`origins` is empty by default; `["*"]` reflects any origin), with configurable methods, headers, and credentials.
- **`rules`** - a top-down, first-match-wins list of `{ conditions, action: "deny" | "allow", status?, message? }` evaluated before auth. Conditions match on `path` / `method` / `ip` / `header` / `query` / `user_agent` with `equals` / `not_equals` / `starts_with` / `in` / `not_in` / `matches`.
- **`trust_proxy`** gates whether `X-Forwarded-For` is honored; **`expose_errors`** (default off) keeps 500 bodies generic.

A route can opt out per-route with an `auth = false` field or `rate_limit = false | { window, max }`.

> First time you enable the server: set `API_TOKENS`, list your `cors.origins`, and change `host` if it must be reachable off-box - otherwise you'll get 401s and no cross-origin access by design.

Error responses share one shape: `{ "code": string, "message": string }` with status 400 / 401 / 403 / 404 / 429 / 500.

## Configuration

Everything lives in `config.ts`:

- `bot` - `intents` and `presence`, passed straight to the discord.js client.
- `commands` - `default_cooldown` and `default_guilds` fill in commands that don't set them.
- `prefix` - `enabled`, `default`, `allow_mention` for text commands.
- `console` / `accent` - log prefix labels and the default embed colour (see [colors](#embeds-and-interactive-helpers)).
- `owners` - bot-owner ids (from the `OWNERS` env var), consumed by the `owner_only` guard.
- `storage` - `{ driver, adapter? }` selecting the persistence backend.
- `localization` - `{ enabled, default, directory }` for i18n.
- `server` - the HTTP API and its security blocks (above).

## Logging

At startup the engine patches `console` so every call is also written to a dated file in `logs/`:

- `console.log` / `warn` / `debug` → `logs/log_DD_MM_YY.log`
- `console.error` → `logs/errors_DD_MM_YY.log`

Colour codes are stripped before writing. The original non-persisting functions stay available as `console._raw_log` / `_raw_warn` / `_raw_debug` / `_raw_error`. Never log a token or secret.

## Testing

Tests run on the Bun test runner:

```bash
bun test
```

The suite covers permissions, the Components V2 helpers, cooldowns, storage, prefix parsing, the guard/cooldown pipeline, the rules engine, the rate limiter, and the HTTP API (auth, rate limiting, CORS, dynamic params, catch-all segments, validation, and error handling). Drive the API with `app.handle(new Request(...))` - no bound port needed. Add tests under `tests/` as `*.test.ts`; see `.agents/tests.md`.

## Scripts

```bash
bun run dev            # watch mode
bun run build          # type-check, then bundle to dist/
bun run start          # run the built bundle
bun run deploy         # register slash + context-menu commands
bun run shard          # build and launch under a ShardingManager
bun run test           # run the test suite
bun run typecheck      # tsc --noEmit
bun run lint           # ESLint
bun run format         # Prettier (write)  ·  format:check to verify
```

## Continuous integration

Two workflows live in `.github/workflows/`:

- **`ci.yml`** runs on every push and pull request: install, format check, lint, type-check, build, test.
- **`release.yml`** publishes a GitHub release. On a push to `main` it reads the version from `package.json` and, if the tag `v{version}` does not exist, creates a stable release for it. Run it manually on the `canary` channel for a prerelease tagged `v{version}-canary.{run}`. The release body is the commit changelog since the previous tag. **Bump `version` in `package.json` to cut a new stable release.**

## Building and running in production

```bash
bun run build && bun run start
```

For large bots, run under discord.js sharding instead of `start`:

```bash
bun run shard
```

This launches a `ShardingManager` that spawns `dist/index.js` across the recommended number of shards. Each shard reads its shard list from the environment, and only the primary shard serves the HTTP API.

## Docker

```bash
docker compose up --build
```

The compose file reads your credentials from `.env`. Adjust the exposed port if you enable the web server.

## License

ISC.
