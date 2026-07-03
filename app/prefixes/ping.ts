import { Prefix, BasePrefixCommand, PrefixCommandBuilder, PrefixContext } from "engine";

@Prefix({ cooldown: 3, guilds: ["*"] })
export default class Ping extends BasePrefixCommand {
	data = new PrefixCommandBuilder().set_name("ping").set_description("Replies with Pong!").add_alias("p");

	async execute(context: PrefixContext) {
		await context.message.reply(`Pong! (${Math.round(context.client.ws.ping)}ms)`);
	}
}
