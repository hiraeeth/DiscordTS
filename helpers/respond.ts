import { Message, MessageFlags } from "discord.js";
import type { BaseMessageOptions, RepliableInteraction } from "discord.js";

export type Respondable = RepliableInteraction | Message;

export function invoker_id(target: Respondable): string {
	return target instanceof Message ? target.author.id : target.user.id;
}

export function allowed_user(target: Respondable, user_id: string | null | undefined): string | null {
	return user_id === undefined ? invoker_id(target) : user_id;
}

export async function reply_and_fetch(target: Respondable, payload: BaseMessageOptions, ephemeral?: boolean): Promise<Message> {
	if (target instanceof Message) return target.reply(payload);
	await target.reply({ ...payload, flags: ephemeral ? MessageFlags.Ephemeral : undefined });
	return target.fetchReply();
}
