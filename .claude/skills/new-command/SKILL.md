---
name: new-command
description: Scaffold a new slash command in app/commands. Use when asked to add or create a slash command, a subcommand, or an autocomplete option.
---

# New slash command

1. Read `.agents/context.md` (Commands section) and `.agents/agents.md` if not already loaded.
2. Create `app/commands/<group>/<name>.ts` (group folders only organize files; the URL-facing name comes from the builder).
3. Default-export a PascalCase class extending `BaseCommand`, decorated with `@Command`, with a `SlashCommandBuilder` on `data` and an `execute(context)` method.

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

## Decorator options

- `cooldown` in seconds, `cooldown_scope` of `"user"` (default), `"guild"`, `"channel"`, or `"global"`.
- `guilds`: array of guild ids, or `["*"]` for global. Omitted options fall back to `config.commands`.
- `guards`: `[owner_only, in_guild, dm_only, nsfw_only, has_perms(...), bot_has_perms(...)]` or custom `(context) => true | string` functions, imported from `"engine"`.

## Variants

- Subcommands: set a `subcommands` field (`{ "name": handler, "group/name": handler }`) and call `this.run_subcommands(context)` from `execute`. Never write a hand-rolled `switch` on subcommand names.
- Autocomplete: call `.setAutocomplete(true)` on the option and implement an optional `autocomplete(interaction)` method; dispatch routes it automatically.
- Shared per-command state goes in a `globals` field, read via `context.globals`.

## Rules

- No comments anywhere. snake_case for locals and methods, PascalCase for the class.
- Never hand-write an `InteractionCreate` router; `engine/dispatch.ts` owns routing.
- Prefer `helpers/embeds`, `helpers/pagination`, `helpers/dialog`, `helpers/form`, or `engine/ui` (Components V2) over hand-built payloads.

## Verify

Run `bun run typecheck` and `bun run lint`. Remind the user to run `bun run deploy` so Discord picks up the new command.
