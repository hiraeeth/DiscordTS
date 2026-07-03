import { config } from "config";
import { Permissions } from "./permissions";
import type { Client, User, Guild, GuildMember, Channel } from "discord.js";
import type { Permission } from "./permissions";

export interface GuardContext {
	client: Client;
	kind: "command" | "prefix" | "component";
	user: User;
	member: GuildMember | null;
	guild: Guild | null;
	channel: Channel | null;
	permissions: Permissions;
	bot_permissions: Permissions;
}

export type GuardResult = true | string;

export type Guard = (context: GuardContext) => GuardResult | Promise<GuardResult>;

export const owner_only: Guard = (context) => (config.owners.includes(context.user.id) ? true : "This command is restricted to the bot owner.");

export const in_guild: Guard = (context) => (context.guild !== null ? true : "This command can only be used in a server.");

export const dm_only: Guard = (context) => (context.guild === null ? true : "This command can only be used in direct messages.");

export const nsfw_only: Guard = (context) => (context.channel !== null && "nsfw" in context.channel && context.channel.nsfw === true ? true : "This command can only be used in NSFW channels.");

export function has_perms(...permissions: Permission[]): Guard {
	return (context) => (context.permissions.all(permissions) ? true : `You are missing the ${context.permissions.missing(permissions).join(", ")} permission${permissions.length > 1 ? "s" : ""}.`);
}

export function bot_has_perms(...permissions: Permission[]): Guard {
	return (context) => (context.bot_permissions.all(permissions) ? true : `I am missing the ${context.bot_permissions.missing(permissions).join(", ")} permission${permissions.length > 1 ? "s" : ""}.`);
}

export async function run_guards(guards: Guard[] | undefined, context: GuardContext): Promise<string | null> {
	if (!guards) return null;
	for (const guard of guards) {
		const result = await guard(context);
		if (result !== true) return result;
	}
	return null;
}
