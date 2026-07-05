# create-discordts

Scaffold a new Discord bot from [DiscordTS-Base](https://github.com/hiraeeth/DiscordTS) with one command.

```bash
bunx create-discordts
```

or, equivalently:

```bash
bun create discordts
```

The CLI walks you through everything interactively:

```
? What is the name of the directory you want to create this project in? » my-bot
? What is your Discord bot token? (leave empty to fill in .env later) » ***
? What is your application client id? (leave empty to fill in .env later) » 1234567890
? Bot owner user ids, comma separated (optional, powers the owner_only guard) »
? Initialize a git repository? » (Y/n)
? Install dependencies with bun? » (Y/n)
```

It downloads the latest template from GitHub, strips repository-only files, renames the package after your directory, writes your `.env`, and optionally initializes git and installs dependencies.

## Usage

```bash
bunx create-discordts [directory] [-y | --yes]
```

- `directory` - skip the first prompt and scaffold into this folder.
- `-y`, `--yes` - non-interactive mode: accept every default (empty credentials, git init, install).

## Requirements

- [Bun](https://bun.sh) 1.1 or newer (the template runs on Bun).
- `tar` on your PATH (bundled with Windows 10+, macOS, and Linux).

## After scaffolding

```bash
cd my-bot
bun run deploy
bun run dev
```

Fill in `TOKEN` and `CLIENT_ID` in `.env` if you skipped them during setup.
