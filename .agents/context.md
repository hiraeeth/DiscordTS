# Architecture and framework surface

DiscordTS-Base is a decorator-driven Discord bot on discord.js v14, running on Bun. Features are small classes dropped into `app/`; the engine discovers, instantiates, and wires them at startup. There is no database.

## The engine owns wiring

The bot is assembled at startup by `boot()` in `engine/`. It scans the `app/` feature directories, reads decorator metadata off each class, instantiates it, injects `client`, and mounts it. You almost never wire things by hand: declare a class with the right decorator, extend the right base class, and drop the file in the right folder. Everything related to the discord.js wrapper lives in `engine/`; `app/` holds only feature classes.

- `engine/` is the whole wrapper: `decorators.ts` (`@Command`, `@Event`, `@Register`, `@Route`), `registry.ts` (metadata keyed by class constructor), `base/` (the base classes), `loaders/` (discovery and mounting), `client.ts` (the shared `Client` and collections), `dispatch.ts` (the interaction router: cooldowns and error handling), `env.ts` (validated env), `deploy.ts` (slash-command registration), and `boot.ts` (orchestration and login). `engine/index.ts` is the barrel; import base classes and decorators from `"engine"`.
- `index.ts` is a thin entrypoint: install the console patch, then `boot()`. Do not add feature logic here.
- Loaders scan relative to `process.cwd()`, so the same code runs from source (`bun index.ts`) and from the bundle (`bun dist/index.js`). The build marks `engine` and `config` external so the bundle and the dynamically-imported `app/` files share one registry.
- `config.ts` is the central configuration: `config.bot` (intents, presence), `config.commands` (default cooldown and guilds), and `config.server` (host, port, prefix, cors, enabled). The engine reads it; the Elysia API only starts when `config.server.enabled` is true.
- `lib/**` holds standalone capabilities: `logger` (file logging and the console patch) and `colors`. Import them through the `@/lib/*` alias.
- Slash commands are not registered on boot. `bun run deploy` (`engine/deploy.ts`) pushes them to Discord; `boot()` only loads them into `client.commands` for dispatch.
- This template ships no database. If a project needs storage, add it under `lib/` behind a single module; never scatter driver calls across features.

```
/engine/index.ts          barrel exports
/engine/decorators.ts     @Command, @Event, @Register, @Route
/engine/registry.ts       metadata keyed by class
/engine/client.ts         shared Client + collections
/engine/dispatch.ts       interaction router
/engine/env.ts            validated environment
/engine/deploy.ts         slash-command registration
/engine/boot.ts           load -> dispatch -> login
/engine/base/command.ts   BaseCommand
/engine/base/event.ts     BaseEvent
/engine/base/component.ts Component master + Button/Modal/Select
/engine/base/route.ts     BaseRoute + RouteContext
/engine/ui.ts             Components V2 builder helpers
/engine/permissions.ts    typed permission manager
/engine/loaders/*.ts      one loader per feature kind
/index.ts                 install_console() + boot()
/config.ts                central config (bot, commands, server)
/app/commands/<group>/<name>.ts
/app/events/<name>.ts
/app/components/<name>.ts
/app/routes/<name>.ts
/lib/logger.ts            file logging + console patch
/lib/colors.ts
/scripts/build.ts         build pipeline
/scripts/deploy.ts        register slash commands
/scripts/shard.ts         sharding launcher
```

## Base classes and decorators are the public surface

Every mountable feature is a `default export class` that extends a base class and carries a decorator that registers it. The decorator supplies registration metadata; typed data (the slash builder, the component's interaction type) comes from the base class and fields. The base class injects `this.client`; implement `execute(...)`, never a `static callback`. Never mount a feature by mutating a client collection by hand.

- **Commands**: `@Command({ cooldown?, guilds? })` on a class `extends BaseCommand`. Set the `data` field to a `SlashCommandBuilder`; implement `execute(context)`. `guilds` is an array of guild ids or `["*"]` for global; omitted options fall back to `config.commands`. Per-command shared state goes in a `globals` field and is exposed on `context.globals`. The command also receives `context.permissions`.
- **Events**: `@Event(name, { once? })` on a class `extends BaseEvent`, where `name` is a `discord.js` `Events` value. Implement `execute(...args)`; `this.client` is available.
- **Components**: `@Register(id)` on a class extending one of the `Component` children: `ButtonComponent`, `ModalComponent`, or a select handler (`SelectComponent` for any select, or the typed `StringSelectComponent` / `UserSelectComponent` / `RoleSelectComponent` / `ChannelSelectComponent` / `MentionableSelectComponent`). The base class fixes both the `kind` and the interaction type of `execute(interaction)`; the loader keys it as `` `${kind}_${id}` `` and `dispatch.ts` routes to it by `customId`. The decorator is named `@Register` (not `@Component`) because `Component` is the base-class name.

Interaction routing (command cooldowns, component dispatch, error replies) is owned by `engine/dispatch.ts`; never hand-write an `InteractionCreate` event to route commands or components.

## Building messages: Components V2

Rich message layouts use Discord's Components V2. `engine/ui.ts` wraps the builders with snake_case helpers: `container()`, `section(lines, accessory)`, `text()`, `separator()`, `thumbnail()`, `gallery()`, `file()`, and `view(...components)` which returns the reply payload with the `IsComponentsV2` flag set. Compose with these and reply with `interaction.reply(view(container(...)))`; never hand-assemble the raw `IsComponentsV2` flag or API JSON. The underlying builders (`ContainerBuilder`, `ButtonBuilder`, etc.) are re-exported from `engine` when you need them directly.

## Permissions

- Gate privileged commands with the permission manager, not ad-hoc bitfield math. Commands receive a ready `Permissions` instance on `context.permissions` (built from the invoking member); elsewhere construct one with `new Permissions(holder)` where `holder` is a `GuildMember`, a `PermissionsBitField`, or `null`.
- Permission names are typed (`Permission`), so `context.permissions.has("ManageGuild")` autocompletes and rejects typos. Use `has`, `all`, `any`, and `missing`; a null or DM holder returns `false` / all-missing rather than throwing.

## HTTP routes: the Elysia API

The optional web layer runs on Elysia with a Next.js-style router. A route is a `default export class` that extends `BaseRoute` and carries `@Route(pattern)`. The pattern declares the URL and its params: `[id]` is a dynamic segment, `[...name]` a catch-all. Implement one async method per HTTP verb you support (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`).

- Each verb method receives a `RouteContext`: `client`, `params`, `query`, `body`, `request`, and `set` (status and headers). Type params and body by annotating the context, for example `POST({ body }: RouteContext<{ id: string }, { content: string }>)`.
- Return a plain object (serialized to JSON) or a `Response`. `this.client` is injected, so a route can read live bot state.
- Validate with zod by setting a `schema` field: `schema: RouteSchemas = { POST: { body: z.object({ ... }) } }`. The engine runs the schema per verb (`body`, `query`, `params`) and returns a structured 400 on failure. `z` is re-exported from `engine`.
- The engine mounts every route under `config.server.prefix`, adds a `/health` route, logs each request, applies CORS, and returns structured JSON for unknown routes. The URL comes from `@Route`, not the file path. When sharded, only the primary shard serves HTTP. Do not stand up a second server or reach for `express`.
