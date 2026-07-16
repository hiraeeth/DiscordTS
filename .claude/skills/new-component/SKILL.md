---
name: new-component
description: Scaffold a persistent button, modal, or select-menu handler in app/components. Use when asked to handle a component interaction by customId.
---

# New component handler

1. Read `.agents/context.md` (Components section) if not already loaded.
2. Create `app/components/<name>.ts`.
3. Default-export a PascalCase class extending the matching base, decorated with `@Register(id)`. The decorator is `@Register` (not `@Component`) because `Component` is the base-class name.

```ts
import { MessageFlags } from "discord.js";
import type { ButtonInteraction } from "discord.js";
import { Register, ButtonComponent } from "engine";

@Register("vote")
export default class Vote extends ButtonComponent {
	async execute(interaction: ButtonInteraction) {
		const [, direction, owner_id] = interaction.customId.split(":");
		if (interaction.user.id !== owner_id) {
			await interaction.reply({ content: "This button is not for you.", flags: MessageFlags.Ephemeral });
			return;
		}
		await interaction.reply(`You voted ${direction}.`);
	}
}
```

## Base classes

`ButtonComponent`, `ModalComponent`, `SelectComponent` (any select), or the typed `StringSelectComponent` / `UserSelectComponent` / `RoleSelectComponent` / `ChannelSelectComponent` / `MentionableSelectComponent`. The base fixes the `execute` interaction type.

## Custom id arguments

Dispatch routes on the segment before the first `:`, so a button with customId `"vote:up:<userId>"` still reaches the `vote` handler. A persistent component has no built-in invoker lock: encode the allowed user id in the customId and reject other clickers, as above. Do not use `@Register` for short-lived flows that `helpers/pagination`, `helpers/panel`, `helpers/dialog`, or `helpers/form` already cover; those enforce their own per-user lock via collectors.

## Rules

- `@Register` accepts `cooldown`, `cooldown_scope`, and `guards` exactly like commands; denials reply ephemerally before `execute`.
- Never hand-write an `InteractionCreate` router; `engine/dispatch.ts` routes by customId.
- No comments, snake_case locals and methods.

## Verify

Run `bun run typecheck` and `bun run lint`. Handlers are live on next boot; no deploy step.
