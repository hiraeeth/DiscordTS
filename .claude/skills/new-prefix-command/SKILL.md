---
name: new-prefix-command
description: Scaffold a new text (prefix) command in app/prefixes, e.g. ".ping". Use when asked to add a message-based or prefix command.
---

# New prefix command

1. Read `.agents/context.md` (Prefix commands section) if not already loaded.
2. Create `app/prefixes/<name>.ts`.
3. Default-export a PascalCase class extending `BasePrefixCommand`, decorated with `@Prefix`, with a `PrefixCommandBuilder` on `data`.

```ts
import { User } from "discord.js";
import { Prefix, BasePrefixCommand, PrefixCommandBuilder, PrefixContext } from "engine";

@Prefix({ cooldown: 3 })
export default class Avatar extends BasePrefixCommand {
	data = new PrefixCommandBuilder().setName("avatar").setDescription("Shows a user's avatar.").addAlias("av").addUser("target", "The user to inspect");

	async execute(context: PrefixContext) {
		const target = context.args.target instanceof User ? context.args.target : context.message.author;
		await context.message.reply(target.displayAvatarURL({ size: 1024 }));
	}
}
```

## Builder and context

- `PrefixCommandBuilder` deliberately mirrors `SlashCommandBuilder` naming (camelCase): `setName`, `setDescription`, `addAlias`, and typed `addString` / `addInteger` / `addNumber` / `addBoolean` / `addUser` / `addMember` / `addChannel` / `addRole` / `addRest`.
- `context.args` holds resolved typed arguments keyed by name; `context.raw` has string tokens and `context.content` the remainder. Also available: `prefix`, `command`, `globals`, `permissions`.
- `@Prefix` accepts `cooldown` and `guilds` like slash commands; aliases share the command's cooldown bucket.

## Rules

- The subsystem is gated by `config.prefix.enabled`; the per-guild prefix lives in `lib/prefixes.ts`.
- Never hand-write a `MessageCreate` router; `engine/prefix_dispatch.ts` owns routing.
- No comments, snake_case locals and methods.

## Verify

Run `bun run typecheck` and `bun run lint`. No deploy step is needed; prefix commands are live on next boot.
