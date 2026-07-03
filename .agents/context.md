# Architecture and framework surface

DiscordTS-Base is a decorator-driven Discord bot on discord.js v14, running on Bun. Features are small classes dropped into `app/`; the engine discovers, instantiates, and wires them at startup. There is no database.

## The engine owns wiring

The bot is assembled at startup by `boot()` in `engine/`. It scans the `app/` feature directories, reads decorator metadata off each class, instantiates it, injects `client`, and mounts it. You almost never wire things by hand: declare a class with the right decorator, extend the right base class, and drop the file in the right folder. Everything related to the discord.js wrapper lives in `engine/`; `app/` holds only feature classes.

- `engine/` is the whole wrapper: `decorators.ts` (`@Command`, `@Event`, `@Register`, `@Route`), `registry.ts` (metadata keyed by class constructor), `base/` (the base classes), `loaders/` (discovery and mounting), `client.ts` (the shared `Client` and collections), `dispatch.ts` (the interaction router: cooldowns and error handling), `env.ts` (validated env), `deploy.ts` (slash-command registration), and `boot.ts` (orchestration and login). `engine/index.ts` is the barrel; import base classes and decorators from `"engine"`.
- `index.ts` is a thin entrypoint: install the console patch, then `boot()`. Do not add feature logic here.
- Loaders scan relative to `process.cwd()`, so the same code runs from source (`bun index.ts`) and from the bundle (`bun dist/index.js`). The build marks `engine` and `config` external so the bundle and the dynamically-imported `app/` files share one registry.
- `config.ts` is the central configuration: `config.bot` (intents, presence), `config.commands` (default cooldown and guilds), `config.prefix` (enabled, default prefix, allow_mention), `config.console` (the `app`/`bot` console prefix labels, their `helpers/color` `Color` colours, the bullet, and an `accent` `Color` used to highlight values in log lines), `config.accent` (a `helpers/color` `Color` — the default embed colour used by the `helpers/embeds` factory and presets' `brand`), `config.owners` (bot-owner ids, read from the `OWNERS` env var and consumed by the `owner_only` guard), `config.storage` (`{ driver: "json" | "memory" | "custom"; adapter? }` selecting the persistence backend), `config.localization` (`{ enabled, default, directory }` for i18n — disabled by default), and `config.server` (`enabled`, `host`, `port`, `prefix`, `trust_proxy`, `expose_errors`, plus the `cors` / `auth` / `rate_limit` / `rules` blocks — see the HTTP section below). The engine reads it; the Elysia API only starts when `config.server.enabled` is true.
- `lib/**` holds standalone capabilities: `logger` (file logging and the console patch), `colors`, `tags` (console prefixes), `duration` (parse/format durations), `runtime` (detect bun/node/deno + package manager), `store` + `storage/*` (pluggable KV persistence), `cooldowns` (per-user/guild/channel/global cooldown manager), `i18n` (locale lookup/interpolation), and `prefixes` (per-guild prefix store, built on `store`). Import them through the `@/lib/*` alias.
- Slash commands are not registered on boot. `bun run deploy` (`engine/deploy.ts`) pushes them to Discord; `boot()` only loads them into `client.commands` for dispatch.
- This template ships no database. If a project needs storage, add it under `lib/` behind a single module; never scatter driver calls across features.

```
/engine/index.ts          barrel exports
/engine/decorators.ts     @Command, @ContextMenu, @Prefix, @Event, @Cron, @Interval, @Register, @Route
/engine/registry.ts       metadata keyed by class
/engine/client.ts         shared Client + collections
/engine/dispatch.ts       interaction router (commands, context menus, autocomplete, components)
/engine/guards.ts         precondition guards (owner_only, in_guild, has_perms, ...)
/engine/cron.ts           5-field cron matcher
/engine/deploy_state.ts   command signature + outdated-deploy check
/engine/env.ts            validated environment
/engine/deploy.ts         slash + context-menu registration
/engine/boot.ts           load -> dispatch -> login
/engine/base/command.ts   BaseCommand (+ optional autocomplete)
/engine/base/context.ts   BaseContextMenu
/engine/base/event.ts     BaseEvent
/engine/base/task.ts      BaseTask
/engine/base/component.ts Component master + Button/Modal/Select
/engine/base/route.ts     BaseRoute + RouteContext
/engine/base/prefix.ts    BasePrefixCommand
/engine/ui.ts             Components V2 builder helpers
/engine/permissions.ts    typed permission manager
/engine/prefix_builder.ts PrefixCommandBuilder (prefix command data)
/engine/prefix_args.ts    tokenizer + typed argument resolution
/engine/prefix_dispatch.ts MessageCreate router for prefix commands
/engine/server_config.ts  HTTP server + security config types
/engine/rules.ts          declarative request deny/allow rule evaluator
/engine/loaders/*.ts      one loader per feature kind
/index.ts                 install_console() + boot()
/config.ts                central config (bot, commands, prefix, console, accent, owners, server)
/app/commands/<group>/<name>.ts
/app/context/<name>.ts
/app/prefixes/<name>.ts
/app/events/<name>.ts
/app/tasks/<name>.ts
/app/components/<name>.ts
/app/routes/<name>.ts
/locales/<code>.json
/lib/logger.ts            file logging + console patch
/lib/prefixes.ts          per-guild prefix store (built on lib/store)
/lib/store.ts             namespaced KV facade over the storage adapter
/lib/storage/*.ts         StorageAdapter + json / memory / custom resolution
/lib/cooldowns.ts         scoped cooldown manager
/lib/ratelimit.ts         fixed-window HTTP rate limiter
/lib/duration.ts          parse "5m" / format ms
/lib/runtime.ts           runtime + package-manager detection
/lib/i18n.ts              locale catalogs, t(), localizations()
/lib/tags.ts              console prefix labels (app / bot), from config
/lib/colors.ts            ansi palette + Color type
/helpers/color.ts         polymorphic Color value (hex/rgb/hsl)
/helpers/embeds.ts        embed factory, presets, page builders
/helpers/pagination.ts    collector-driven embed paginator
/helpers/panel.ts         interactive settings panel
/helpers/dialog.ts        confirm / alert button prompts
/helpers/form.ts          multi-field modal -> typed values
/helpers/respond.ts       reply-or-fetch + user-lock shared by helpers
/scripts/build.ts         build pipeline
/scripts/deploy.ts        register slash + context-menu commands
/scripts/shard.ts         sharding launcher
```

## Base classes and decorators are the public surface

Every mountable feature is a `default export class` that extends a base class and carries a decorator that registers it. The decorator supplies registration metadata; typed data (the slash builder, the component's interaction type) comes from the base class and fields. The base class injects `this.client`; implement `execute(...)`, never a `static callback`. Never mount a feature by mutating a client collection by hand.

- **Commands**: `@Command({ cooldown?, cooldown_scope?, guilds?, guards? })` on a class `extends BaseCommand`. Set the `data` field to a `SlashCommandBuilder`; implement `execute(context)`. `guilds` is an array of guild ids or `["*"]` for global; omitted options fall back to `config.commands`. Per-command shared state goes in a `globals` field and is exposed on `context.globals`. The command also receives `context.permissions`. For autocomplete options (`setAutocomplete(true)`), implement an optional `autocomplete(interaction)` method — `dispatch.ts` routes autocomplete interactions to it. For subcommands, set a `subcommands` field (`{ "name": handler, "group/name": handler }`) and call `this.run_subcommands(context)` from `execute` instead of a hand-written `switch`. Cooldowns and guards are described below.
- **Context-menu commands**: `@ContextMenu({ cooldown?, cooldown_scope?, guilds?, guards? })` on a class `extends BaseContextMenu`. Set the `data` field to a `ContextMenuCommandBuilder` (`.setType(ApplicationCommandType.User | Message)`); implement `execute(context)` where `context.interaction` is a `ContextMenuCommandInteraction` (narrow with `isUserContextMenuCommand()` / `isMessageContextMenuCommand()`). Registered by `bun run deploy` alongside slash commands; routed by `dispatch.ts`.
- **Prefix commands**: `@Prefix({ cooldown?, guilds? })` on a class `extends BasePrefixCommand`. These are text commands (`.ping`) — an alternative to slash commands, driven off `MessageCreate`. Set the `data` field to a `PrefixCommandBuilder` — it deliberately mirrors discord.js's `SlashCommandBuilder` naming (camelCase), so `setName`, `setDescription`, `addAlias`, and typed `addString` / `addInteger` / `addNumber` / `addBoolean` / `addUser` / `addMember` / `addChannel` / `addRole` / `addRest`; implement `execute(context)`. The context carries both raw args (`context.raw` string tokens, `context.content` remainder) and resolved typed args (`context.args`, keyed by argument name), plus `prefix`, `command`, `globals`, and `permissions`. Cooldown and `guilds` behave like slash commands. The prefix is per-guild: it comes from `config.prefix.default`, is overridable at runtime via `lib/prefixes.ts` (persisted to `data/prefixes.json`), and `config.prefix.allow_mention` also lets `@bot` act as a prefix. The whole subsystem is gated by `config.prefix.enabled`.
- **Events**: `@Event(name, { once? })` on a class `extends BaseEvent`, where `name` is a `discord.js` `Events` value. Implement `execute(...args)`; `this.client` is available.
- **Scheduled tasks**: `@Cron("*/5 * * * *")` or `@Interval("30s" | ms)` on a class `extends BaseTask`; implement `execute()`. `@Interval` accepts a duration string (parsed by `lib/duration`) or raw ms and fires on a `setInterval`; `@Cron` fires when a 5-field cron expression (`engine/cron.ts`) matches, evaluated once per minute. `this.client` is injected. Live in `app/tasks/`; the presence-rotation example is one. Never hand-roll a `setInterval` in a feature — declare a task.
- **Components**: `@Register(id, { cooldown?, cooldown_scope?, guards? })` on a class extending one of the `Component` children: `ButtonComponent`, `ModalComponent`, or a select handler (`SelectComponent` for any select, or the typed `StringSelectComponent` / `UserSelectComponent` / `RoleSelectComponent` / `ChannelSelectComponent` / `MentionableSelectComponent`). The base class fixes both the `kind` and the interaction type of `execute(interaction)`; the loader keys it as `` `${kind}_${id}` `` and `dispatch.ts` routes to it by `customId`. The decorator is named `@Register` (not `@Component`) because `Component` is the base-class name. Guards and cooldown run before `execute` exactly like commands (same pipeline, keyed `component:<id>:<scope>:<scope_id>`); a denial or active cooldown replies ephemerally and the handler never runs. **Custom ids may carry arguments after a `:` separator** — `dispatch.ts` routes on the segment before the first `:`, so a button with `customId` `"vote:up:<messageAuthorId>"` still routes to the `vote` handler, which reads the rest off `interaction.customId`. Because a persistent component has no built-in notion of who may click it, this is how you lock one to its invoker: encode the allowed user id in the custom id and reject others in `execute` (or a guard) — never assume the clicker is the original user. The collector-based `helpers/` (`pagination`, `panel`, `dialog`) already enforce their own per-user lock; `@Register` components do not.

Interaction routing (chat-input commands, context menus, autocomplete, component dispatch, guards, cooldowns, error replies) is owned by `engine/dispatch.ts`; never hand-write an `InteractionCreate` event to route commands or components. Prefix-command routing (prefix match, argument resolution, guards, cooldowns, error replies) is owned by `engine/prefix_dispatch.ts`; never hand-write a `MessageCreate` event to route prefix commands.

## Guards and cooldowns

Both dispatchers run the same precondition pipeline before `execute`: **guards**, then **cooldown**.

- **Guards** (`engine/guards.ts`, re-exported from `engine`): a `Guard` is `(context: GuardContext) => true | string | Promise<...>`, returning `true` to pass or a failure message that is shown to the user. Pass them via `guards: [...]` on `@Command` / `@ContextMenu` / `@Prefix`. Built-ins: `owner_only` (checks `config.owners`), `in_guild`, `dm_only`, `nsfw_only`, `has_perms(...perms)`, `bot_has_perms(...perms)`. Write custom guards as plain functions; prefer them over ad-hoc `if (!permissions.has(...))` blocks inside `execute`. The `GuardContext` carries `client`, `user`, `member`, `guild`, `channel`, `permissions` (the invoker's), and `bot_permissions`.
- **Cooldowns** (`lib/cooldowns.ts`): `cooldown` is in seconds; `cooldown_scope` is `"user"` (default), `"guild"`, `"channel"`, or `"global"`. The shared `cooldowns` manager keys a bucket per feature + scope + id (built by `cooldown_bucket`, keyed on the command's canonical name — prefix aliases share the command's bucket), and the dispatcher replies with the remaining time via `format_duration`. **Cooldowns are in-process and volatile**: the buckets live in a plain `Map`, so they reset on restart and are per-process — under `bun run shard` each shard tracks its own, which means `"global"` scope is really "global per shard", not cluster-wide. Treat cooldowns as a best-effort courtesy limit, not a hard quota; a hard cross-process limit needs a storage-backed manager (mirror the `lib/store` pattern). Guards run *before* the cooldown, so a guard rejection is reported even while on cooldown — but that also means guard work is not itself rate-limited.

## Storage, i18n, and durations

- **Storage is pluggable.** `lib/store.ts`'s `store<T>(name)` is a typed, namespaced facade (`get` / `set` / `has` / `delete` / `all` / `keys` / `clear` / `reload`) over the active `StorageAdapter`, selected by `config.storage.driver`: `"json"` (default — one `data/<name>.json` file per namespace; base dir overridable with `DATA_DIR`, which tests use; writes are atomic via temp-file-plus-rename, the in-memory cache re-reads when the file's mtime changes, and a file that fails to parse is quarantined to `<name>.json.<pid>.corrupt` rather than silently reset — but it is single-process-preferred, so multi-process deployments like `bun run shard` that share persisted state should use a `"custom"` adapter backed by a real database), `"memory"` (ephemeral), or `"custom"` (supply your own `config.storage.adapter` — implement the `StorageAdapter` interface from `@/lib/storage/adapter` to back it with SQLite, Prisma, Redis, etc.; an optional async `init()` runs at boot). `lib/prefixes.ts` and `engine/deploy_state.ts` are both built on `store` — model new persisted state the same way rather than hand-rolling `fs` or driver calls. `lib/runtime.ts` exposes `runtime()`, `package_manager()`, and `has_module(name)` for environment-aware wiring.
- **i18n** (`lib/i18n.ts`, off by default via `config.localization.enabled`): JSON catalogs under `config.localization.directory` (`locales/<code>.json`, dot-nested keys). `t(key, locale?, vars?)` resolves against the requested locale (when enabled) then the default, interpolates `{vars}`, and falls back to the key; `locale_of(interaction)` normalizes `interaction.locale`; `localizations(key)` builds a `LocalizationMap` for `setNameLocalizations` / `setDescriptionLocalizations`. Name locale files with valid Discord locale codes if you use them for command localization.
- `lib/duration.ts`: `parse_duration("1h30m" | 500 | "5m")` → ms (or `null`), and `format_duration(ms, { units? })` → `"1m 30s"`. Underpins cooldown messaging, `@Interval`, and any timeout you expose.
- **Deploy freshness**: `engine/deploy_state.ts` hashes the loaded command + context-menu builders; `bun run deploy` saves the signature, and `boot()` warns (`Slash commands are outdated — run <pm> run deploy`) when the current signature differs. Uses the storage adapter, so cross-process freshness needs a persistent driver (the `memory` driver always warns).

## Building messages: Components V2

Rich message layouts use Discord's Components V2. `engine/ui.ts` wraps the builders with snake_case helpers: `container()`, `section(lines, accessory)`, `text()`, `separator()`, `thumbnail()`, `gallery()`, `file()`, and `view(...components)` which returns the reply payload with the `IsComponentsV2` flag set. Compose with these and reply with `interaction.reply(view(container(...)))`; never hand-assemble the raw `IsComponentsV2` flag or API JSON. The underlying builders (`ContainerBuilder`, `ButtonBuilder`, etc.) are re-exported from `engine` when you need them directly.

## Building messages: embeds and pagination

Traditional embeds (mutually exclusive with the Components V2 flag) have their own helpers under `helpers/`, imported via `@/helpers/*`. Do not hand-roll `new EmbedBuilder()` chains or ad-hoc button navigation when these cover it.

- `helpers/color.ts` is the colour value type. The polymorphic `color(...)` accepts a hex string (`"#fff"`, `"#5865f2"`, `"0x5865f2"`, bare `"5865f2"`), an integer (`0x5865f2`), rgb(a) channels (`color(255, 0, 0)`, `color(255, 0, 0, 128)`), a CSS string (`"rgb(...)"`, `"rgba(...)"`, `"hsl(...)"`, `"hsla(...)"`), or another `Color`. Named constructors `rgb` / `rgba` / `hsl` / `hsla` / `hex` (and the matching `Color.*` statics / `Color.from`) do the same explicitly. A `Color` exposes `r`/`red`, `g`/`green`, `b`/`blue`, `a`/`alpha` (all 0–255), plus `int`, `hex`, `hexa`, `rgb`, `rgba`, `hsl`, `hsla`, `css`, and `with()`; it coerces to its Discord integer via `valueOf` / `toJSON`. Anywhere a helper takes a colour (`embed`, presets, `panel`, `dialog`, `config.accent`, the `EMBED_COLORS` palette) you can pass a `Color` or a raw discord.js `ColorResolvable` — the embed factory resolves either.
- `helpers/embeds.ts` builds embeds fast: `embed(options)` turns a plain options object (`title`, `description`, `color`, `fields`, `author`/`footer` as string-or-object, `thumbnail`, `image`, `timestamp`) into an `EmbedBuilder`; `success` / `error` / `warning` / `info` / `neutral` are colour presets over the shared `EMBED_COLORS` palette; `fields_to_pages(items, { render, per_page, base, counter })` and `lines_to_pages(lines, options)` chunk a dataset into an `EmbedBuilder[]` ready for pagination.
- `helpers/pagination.ts` drives an `EmbedBuilder[]` with a button navigator: `paginate(target, pages, options?)` where `target` is a `RepliableInteraction` **or** a `Message` (so both slash and prefix commands can paginate). It replies, attaches a `MessageComponentCollector`, and handles first/prev/next/last plus a page counter. Options: `timeout`, `user_id` (`undefined` locks to the invoker, `null` allows anyone, a string restricts to that user), `ephemeral`, `counter`, `on_end` (`"disable"` or `"remove"`), and `start`. It short-circuits to a plain reply for zero or one page and disables the controls when the collector ends.
- `helpers/panel.ts` builds an interactive settings panel: `panel(target, { title?, description?, settings, ... })`. Each entry in `settings` is a typed `PanelSetting` with a `key`, `label`, a `kind` of `boolean` / `text` / `number` / `choice`, and `get` / `set` callbacks (state lives wherever you point them — a command's `globals`, `lib/prefixes`, etc.). The panel renders an embed of current values plus a select menu; picking a setting toggles a boolean, opens a choices select, or shows a modal for text/number (validated against `max`/`min`). It shares `user_id`/`timeout`/`ephemeral` semantics with the paginator.
- `helpers/dialog.ts` builds button prompts (not text-input modals — those are the panel's job). `dialog(target, { title?, description?, buttons, ... })` shows a row of buttons and resolves to the clicked button's `value`/`id` (or `null` on timeout), disabling the row once answered. Two presets sit on top: `confirm(target, { confirm_label?, cancel_label?, danger?, ... })` resolves to a boolean (with a red confirm button and error colour when `danger`), and `alert(target, { label?, ... })` shows a single acknowledge button. Custom footers like Retry/Cancel/Skip come from either `confirm`'s label options or a raw `dialog` call.
- `helpers/form.ts` shows a standalone modal and returns its typed values: `form(target, { title, fields })` where `target` is a command or component interaction and each field is `{ key, label, kind?: "text" | "number", style?, required?, min?, max?, ... }` (up to 5). It resolves to `{ values, interaction }` (the `ModalSubmitInteraction` to respond through) or `null` on timeout; number fields are validated against `min`/`max`. This is the general form primitive; the panel builds its own single-field modals inline for its edit flow.
- `helpers/respond.ts` holds the reply-or-fetch and user-lock logic the paginator, panel, and dialogs reuse — do not re-implement it per helper.

## Permissions

- Gate privileged commands with the permission manager, not ad-hoc bitfield math. Commands receive a ready `Permissions` instance on `context.permissions` (built from the invoking member); elsewhere construct one with `new Permissions(holder)` where `holder` is a `GuildMember`, a `PermissionsBitField`, or `null`.
- Permission names are typed (`Permission`), so `context.permissions.has("ManageGuild")` autocompletes and rejects typos. Use `has`, `all`, `any`, and `missing`; a null or DM holder returns `false` / all-missing rather than throwing.

## HTTP routes: the Elysia API

The optional web layer runs on Elysia with a Next.js-style router. A route is a `default export class` that extends `BaseRoute` and carries `@Route(pattern)`. The pattern declares the URL and its params: `[id]` is a dynamic segment, `[...name]` a catch-all. Implement one async method per HTTP verb you support (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`).

- Each verb method receives a `RouteContext`: `client`, `params`, `query`, `body`, `request`, and `set` (status and headers). Type params and body by annotating the context, for example `POST({ body }: RouteContext<{ id: string }, { content: string }>)`.
- Return a plain object (serialized to JSON) or a `Response`. `this.client` is injected, so a route can read live bot state.
- Validate with zod by setting a `schema` field: `schema: RouteSchemas = { POST: { body: z.object({ ... }) } }`. The engine runs the schema per verb (`body`, `query`, `params`) and returns a structured 400 on failure. `z` is re-exported from `engine`.
- The engine mounts every route under `config.server.prefix`, adds a `/health` route, logs each request, and returns structured JSON for unknown routes. The URL comes from `@Route`, not the file path. When sharded, only the primary shard serves HTTP. Do not stand up a second server or reach for `express`.
- **The API is secured declaratively through `config.server`, enforced centrally in `engine/loaders/routes.ts` — never re-implement auth or rate limiting inside a route.** The defaults are secure-by-default and only apply once `enabled` is true: `host: "127.0.0.1"` (loopback; change it to expose off-box), `cors` (an object: `enabled`, `origins` — empty by default, `["*"]` reflects any origin, `methods`, `headers`, `credentials`), `auth` (`enabled` true, `scheme` `"bearer"` | `"header"`, `header`, `tokens` read from the `API_TOKENS` env var, `public_paths` — `["/health"]`; tokens are compared in constant time and a missing/invalid token returns 401), `rate_limit` (`enabled` true, `window` — a `lib/duration` string, `max`, `scope` `"ip"` | `"global"`, `public_paths`; a fixed-window in-process limiter in `lib/ratelimit.ts` — per-process, so it is per-shard under `bun run shard` and best treated as a soft per-IP guard, returns 429 with `Retry-After`), and `rules` (a top-down, first-match-wins list of `{ conditions, action: "deny" | "allow", status?, message? }`; each condition is `{ field: "path" | "method" | "ip" | "header" | "query" | "user_agent", key?, operator: "equals" | "not_equals" | "starts_with" | "in" | "not_in" | "matches", value }`, evaluated in `engine/rules.ts` before auth — keep `matches` patterns simple, they run against untrusted request data). `trust_proxy` gates whether `X-Forwarded-For` is honored for the client IP; `expose_errors` (default false) keeps 500 bodies generic. A route can opt out per-route with an `auth = false` field or `rate_limit = false | { window, max }`. Turning the server on for the first time means setting `API_TOKENS`, listing `cors.origins`, and changing `host` if it must be reachable off-box — otherwise expect a wall of 401s and no cross-origin access by design. The health route is always public (it never runs the security pipeline).
