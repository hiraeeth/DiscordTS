import { config } from "config";
import { get_prefix, set_prefix, clear_prefix, is_valid_prefix, MAX_PREFIX_LENGTH } from "@/lib/prefixes";
import { Prefix, BasePrefixCommand, PrefixCommandBuilder, PrefixContext } from "engine";

@Prefix({ guilds: ["*"] })
export default class Config extends BasePrefixCommand {
	data = new PrefixCommandBuilder().setName("config").setDescription("Inspect and change the server prefix.").addAlias("cfg");

	async execute(context: PrefixContext) {
		const guild_id = context.message.guildId;
		if (!guild_id) {
			await context.message.reply("This command can only be used in a server.");
			return;
		}

		const [target, action, value] = context.raw;
		if (target?.toLowerCase() !== "prefix") {
			await this.show(context, guild_id);
			return;
		}

		if (action === undefined) {
			await this.show(context, guild_id);
			return;
		}

		if (!context.permissions.has("ManageGuild")) {
			await context.message.reply("You need the Manage Server permission to change the prefix.");
			return;
		}

		if (action.toLowerCase() === "reset") {
			clear_prefix(guild_id);
			await context.message.reply(`Prefix reset to \`${config.prefix.default}\`.`);
			return;
		}

		if (action.toLowerCase() === "set") {
			if (value === undefined || !is_valid_prefix(value)) {
				await context.message.reply(`Provide a prefix without spaces, up to ${MAX_PREFIX_LENGTH} characters.`);
				return;
			}
			set_prefix(guild_id, value);
			await context.message.reply(`Prefix set to \`${value}\`.`);
			return;
		}

		await this.show(context, guild_id);
	}

	private async show(context: PrefixContext, guild_id: string) {
		const current = get_prefix(guild_id);
		const lines = [`Current prefix: \`${current}\``, `Change it with \`${context.prefix}config prefix set <value>\` or \`${context.prefix}config prefix reset\`.`];
		await context.message.reply(lines.join("\n"));
	}
}
