---
name: new-context-menu
description: Scaffold a right-click context-menu command (on a user or message) in app/context. Use when asked to add a context-menu or right-click command.
---

# New context-menu command

1. Read `.agents/context.md` (Context-menu commands section) if not already loaded.
2. Create `app/context/<name>.ts`.
3. Default-export a PascalCase class extending `BaseContextMenu`, decorated with `@ContextMenu`, with a `ContextMenuCommandBuilder` on `data`.

```ts
import { ApplicationCommandType, ContextMenuCommandBuilder } from "discord.js";
import { ContextMenu, BaseContextMenu, ContextMenuContext } from "engine";

@ContextMenu({ guilds: ["*"] })
export default class Avatar extends BaseContextMenu {
	data = new ContextMenuCommandBuilder().setName("Avatar").setType(ApplicationCommandType.User);

	async execute(context: ContextMenuContext) {
		if (!context.interaction.isUserContextMenuCommand()) return;
		await context.interaction.reply(context.interaction.targetUser.displayAvatarURL());
	}
}
```

## Notes

- `.setType(ApplicationCommandType.User | Message)` picks the target kind; narrow inside `execute` with `isUserContextMenuCommand()` / `isMessageContextMenuCommand()`.
- `@ContextMenu` accepts the same options as `@Command`: `cooldown`, `cooldown_scope`, `guilds`, `guards`.
- Context-menu names are Title Case with spaces allowed, unlike slash command names.

## Verify

Run `bun run typecheck` and `bun run lint`. Remind the user to run `bun run deploy`; context menus register alongside slash commands.
