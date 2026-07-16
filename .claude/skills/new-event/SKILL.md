---
name: new-event
description: Scaffold a gateway event handler in app/events. Use when asked to react to a Discord event like GuildMemberAdd, MessageCreate, or Ready.
---

# New event handler

1. Read `.agents/context.md` (Events section) if not already loaded.
2. Create `app/events/<name>.ts`.
3. Default-export a PascalCase class extending `BaseEvent`, decorated with `@Event(Events.X, { once? })`; implement `execute(...args)` with the event's discord.js signature.

```ts
import { Events, GuildMember } from "discord.js";
import { Event, BaseEvent } from "engine";

@Event(Events.GuildMemberAdd)
export default class Welcome extends BaseEvent {
	async execute(member: GuildMember) {
		console.log(`${member.user.tag} joined ${member.guild.name}`);
	}
}
```

## Rules

- `name` must be a `discord.js` `Events` enum value; pass `{ once: true }` for one-shot events.
- `this.client` is injected by the loader.
- Never route slash commands, components, or prefix commands from an event class; `engine/dispatch.ts` and `engine/prefix_dispatch.ts` own `InteractionCreate` and `MessageCreate` routing.
- Check `config.bot` intents cover the event (e.g. `GuildMembers` for member events) and flag it if they do not.
- No comments, snake_case locals and methods.

## Verify

Run `bun run typecheck` and `bun run lint`. Events are live on next boot; no deploy step.
