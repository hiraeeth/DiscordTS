# DiscordTS Base

A decorator driven Discord bot template built with TypeScript, discord.js v14, and Bun. You write small feature classes, drop them in a folder, and the engine discovers, mounts, and wires them for you. There is no database and no boilerplate to maintain.

## Requirements

- [Bun](https://bun.sh) 1.1 or newer
- A Discord application with a bot token and client id

## Getting started

1. Install dependencies:

   ```bash
   bun install
   ```

2. Create a `.env` file from the example and fill in your credentials:

   ```bash
   cp .env.example .env
   ```

   ```
   TOKEN=your_bot_token
   CLIENT_ID=your_application_id
   ```

3. Register your slash commands with Discord (run this whenever your command definitions change):

   ```bash
   bun run deploy
   ```

4. Run in development with hot reload:

   ```bash
   bun run dev
   ```

## Project structure

```
engine/        the discord.js wrapper: decorators, base classes, loaders, dispatch, ui, permissions
app/
  commands/    slash commands, grouped in subfolders
  events/      gateway event handlers
  components/  button, modal, and select handlers
  routes/      HTTP API routes (@Route classes)
lib/           cross cutting helpers: logger and colors
config.ts      central configuration: bot, commands, server
index.ts       entrypoint: installs the console patch and boots the engine
```

You only edit files under `app/` and `config.ts`. Everything in `engine/` is the framework.

## Configuration

All settings live in `config.ts`:

```ts
export const config = {
	bot: {
		intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent],
		presence: { status: "online", activities: [{ name: "the server", type: ActivityType.Watching }] },
	},
	commands: {
		default_cooldown: 0,
		default_guilds: ["*"],
	},
	server: {
		enabled: false,
		host: "0.0.0.0",
		port: 3000,
		prefix: "/api",
		cors: true,
	},
};
```

- `bot.intents` and `bot.presence` are passed straight to the discord.js client.
- `commands.default_cooldown` and `commands.default_guilds` fill in any command that does not set them in `@Command`.
- `server` controls the HTTP API described below.

## Commands

A command is a class that extends `BaseCommand` and carries the `@Command` decorator. Set the slash builder on `data` and implement `execute`. Files live in `app/commands/<group>/<name>.ts`.

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

- `cooldown` is in seconds and is enforced by the engine.
- `guilds` is a list of guild ids, or `["*"]` to register the command globally.
- `context` gives you `client`, `interaction`, `permissions`, `globals`, and the command metadata.

Per command shared state goes in a `globals` field and is available on `context.globals`:

```ts
@Command({ guilds: ["*"] })
export default class Ping extends BaseCommand {
	data = new SlashCommandBuilder().setName("ping").setDescription("Ping");
	globals = { greeting: "Pong" };

	async execute(context: CommandContext) {
		await context.interaction.reply(String(context.globals.greeting));
	}
}
```

## Events

An event is a class that extends `BaseEvent` and carries `@Event`. The first argument is a discord.js `Events` value. Use `{ once: true }` for one time events like ready.

```ts
import { Events, Client } from "discord.js";
import { Event, BaseEvent } from "engine";

@Event(Events.ClientReady, { once: true })
export default class Ready extends BaseEvent {
	async execute(client: Client) {
		console.log(`${client.user?.username} is online.`);
	}
}
```

You never write an `InteractionCreate` event to route commands or components. The engine owns that.

## Components

A component handles an interaction from a button, a modal, or a select menu. Extend the matching base class, register it with `@Register(id)`, and implement `execute`. The `id` is the `customId` of the component you send.

```ts
import type { ButtonInteraction } from "discord.js";
import { Register, ButtonComponent } from "engine";

@Register("panel_button")
export default class PanelButton extends ButtonComponent {
	async execute(interaction: ButtonInteraction) {
		await interaction.reply("You clicked the button!");
	}
}
```

Available base classes:

- `ButtonComponent`
- `ModalComponent`
- `SelectComponent` for any select menu
- `StringSelectComponent`, `UserSelectComponent`, `RoleSelectComponent`, `ChannelSelectComponent`, `MentionableSelectComponent` for a typed `execute` argument

## Components V2

`engine` exports helpers for Discord Components V2, so you can build rich layouts without touching raw flags or JSON. Wrap your top level components in `view(...)` and reply with the result.

```ts
import { ButtonStyle } from "discord.js";
import { view, container, text, separator, section, ButtonBuilder } from "engine";

const layout = container(
	text("## Components V2 panel"),
	separator(),
	section(["Press the button on the right."], new ButtonBuilder().setCustomId("panel_button").setLabel("Click me").setStyle(ButtonStyle.Primary))
);

await interaction.reply(view(layout));
```

Helpers: `container`, `section`, `text`, `separator`, `thumbnail`, `gallery`, `file`, and `view`. The underlying builders (`ContainerBuilder`, `ButtonBuilder`, and the rest) are re-exported from `engine` when you need them directly.

## Permissions

Commands receive a ready to use `Permissions` instance on `context.permissions`, built from the member who ran the command. Permission names are typed, so your editor autocompletes them and catches typos.

```ts
async execute(context: CommandContext) {
	if (!context.permissions.has("ManageGuild")) {
		await context.interaction.reply("You need the Manage Server permission.");
		return;
	}

	await context.interaction.reply("Welcome, moderator.");
}
```

Methods: `has(permission)`, `all(permissions)`, `any(permissions)`, and `missing(permission)`. You can build one anywhere with `new Permissions(holder)` where `holder` is a `GuildMember`, a `PermissionsBitField`, or `null`. A null holder returns `false` instead of throwing.

## Logging

At startup the engine patches `console` so every call is also written to a dated file in `logs/`:

- `console.log`, `console.warn`, and `console.debug` go to `logs/log_DD_MM_YY.log`
- `console.error` goes to `logs/errors_DD_MM_YY.log`

Color codes are stripped before writing. The original, non persisting functions stay available as `console._raw_log`, `console._raw_warn`, `console._raw_debug`, and `console._raw_error`.

## HTTP API

The web layer runs on [Elysia](https://elysiajs.com) with a Next.js style router. It is off by default. Turn it on by setting `server.enabled` to `true` in `config.ts`.

A route is a class that extends `BaseRoute` and carries `@Route(pattern)`. The pattern declares the URL and its parameters: `[id]` is a dynamic segment and `[...name]` is a catch all. Add one async method per HTTP verb you want to handle. Set an optional `schema` of zod validators to validate input; invalid requests get an automatic 400.

```ts
import { Route, BaseRoute, RouteContext, RouteSchemas, z } from "engine";

const body = z.object({ content: z.string() });

@Route("/guilds/[id]")
export default class GuildRoute extends BaseRoute {
	schema: RouteSchemas = {
		POST: { body },
	};

	async GET({ client, params }: RouteContext<{ id: string }>) {
		const guild = client.guilds.cache.get(params.id);
		return { id: params.id, name: guild ? guild.name : null };
	}

	async POST({ params, body }: RouteContext<{ id: string }, z.infer<typeof body>>) {
		return { id: params.id, content: body.content };
	}
}
```

Validators can cover `body`, `query`, and `params`; `z` is re-exported from `engine`.

Each verb method receives a context with `client`, `params`, `query`, `body`, `request`, and `set` (status and headers). Return a plain object to send JSON, or a `Response`. Every route is mounted under `server.prefix`, so the example above serves `GET /api/guilds/:id`. The engine also adds a `/health` route, logs each request, applies CORS, and returns structured JSON for unknown routes and invalid payloads. The URL comes from `@Route`, so name your files under `app/routes/` however you like.

### API reference

These are the routes shipped in the template, all under the `server.prefix` (default `/api`).

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| GET | `/health` | none | Liveness probe. Returns `{ "status": "ok" }`. |
| GET | `/guilds/:id` | none | Looks the guild up in the bot cache. Returns `{ "id", "name" }` where `name` is `null` when the bot is not in that guild. |
| POST | `/guilds/:id` | `{ "content": string }` | Validated with a schema. Returns `{ "id", "content" }`, or `400 { "code": "invalid_request" }` when the body is invalid. |
| GET | `/files/*path` | none | Catch-all example. Returns `{ "path": string }` with everything after `/files/`. |

Error responses share one shape:

| Status | Body |
| --- | --- |
| 400 | `{ "code": "invalid_request", "message": "..." }` |
| 404 | `{ "code": "route_not_found", "message": "..." }` |
| 500 | `{ "code": "internal_error", "message": "..." }` |

## Testing

Tests run on the Bun test runner:

```bash
bun test
```

The suite covers the permission manager, the Components V2 helpers, and the HTTP API (dynamic params, catch-all segments, body validation, and error handling). Add new tests under `tests/` as `*.test.ts`.

## Formatting and linting

Prettier and ESLint keep the code consistent:

```bash
bun run format        # apply Prettier
bun run format:check  # verify formatting
bun run lint          # run ESLint
```

Both run in CI, so keep them clean.

## Continuous integration

Two workflows live in `.github/workflows/`:

- `ci.yml` runs on every push and pull request. It installs dependencies, checks formatting, lints, type checks, builds, and runs the tests.
- `release.yml` publishes a GitHub release. On a push to `main` it reads the version from `package.json` and, if the tag `v{version}` does not exist yet, creates a stable release for it. Run it manually with the `canary` channel to publish a prerelease tagged `v{version}-canary.{run}`. Either way the release body is the commit changelog since the previous tag. Bump the version in `package.json` to cut a new stable release.

## Building for production

```bash
bun run build
```

This type checks the project and bundles `index.ts` to `dist/`. Start the built app with:

```bash
bun run start
```

## Sharding

For large bots, run under discord.js sharding instead of `start`:

```bash
bun run shard
```

This builds the app and launches a `ShardingManager` that spawns `dist/index.js` across the recommended number of shards. Each shard reads its shard list from the environment automatically, and only the primary shard serves the HTTP API.

## Docker

Build and run with Docker Compose:

```bash
docker compose up --build
```

The compose file reads your credentials from `.env`. Adjust the exposed port if you enable the web server.
