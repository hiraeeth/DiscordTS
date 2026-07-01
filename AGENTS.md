# This is a Discord.js + TypeScript bot base

This repo is **DiscordTS-Base**: a decorator-driven Discord bot framework written in TypeScript on top of `discord.js` v14. There is no frontend and there never will be. Every surface is a bot interaction, a gateway event, or an HTTP route on the Elysia API, all wired through a small loader engine.

Package APIs and conventions may differ from your training data: `discord.js` v14 changed a great deal from earlier versions, and this project pins specific versions. Read the relevant docs (the package's own `.d.ts`, the `discord.js` guide and API reference) before writing any code. Heed deprecation notices; prefer the builders and enums the installed version actually exports.

The runtime is **Bun** (`bun run dev` / `build` / `start`). Decorators are enabled (`experimentalDecorators`, `emitDecoratorMetadata`) and registration is metadata-driven: a class declares itself with a decorator, and a loader discovers and mounts it at startup. This is a lean template with no database; cross-cutting helpers live in `lib/`.

- `.agents/context.md`: how the framework is built and its public surface.
- `.agents/agents.md`: the coding rules.
- `.agents/tests.md`: how to test.

@.agents/context.md

@.agents/agents.md

@.agents/tests.md
