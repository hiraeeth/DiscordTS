import { User } from "discord.js";
import { Prefix, BasePrefixCommand, PrefixCommandBuilder, PrefixContext } from "engine";

@Prefix({ guilds: ["*"] })
export default class Avatar extends BasePrefixCommand {
	data = new PrefixCommandBuilder().set_name("avatar").set_description("Shows a user's avatar.").add_alias("av").add_user("target", "The user to inspect");

	async execute(context: PrefixContext) {
		const target = context.args.target instanceof User ? context.args.target : context.message.author;
		await context.message.reply(target.displayAvatarURL({ size: 1024 }));
	}
}
