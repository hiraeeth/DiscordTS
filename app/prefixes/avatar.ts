import { User } from "discord.js";
import { Prefix, BasePrefixCommand, PrefixCommandBuilder, PrefixContext } from "engine";

@Prefix({ guilds: ["*"] })
export default class Avatar extends BasePrefixCommand {
	data = new PrefixCommandBuilder().setName("avatar").setDescription("Shows a user's avatar.").addAlias("av").addUser("target", "The user to inspect");

	async execute(context: PrefixContext) {
		const target = context.args.target instanceof User ? context.args.target : context.message.author;
		await context.message.reply(target.displayAvatarURL({ size: 1024 }));
	}
}
