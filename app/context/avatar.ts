import { ContextMenuCommandBuilder, ApplicationCommandType, MessageFlags } from "discord.js";
import { ContextMenu, BaseContextMenu, ContextMenuContext } from "engine";

@ContextMenu({ guilds: ["*"] })
export default class Avatar extends BaseContextMenu {
	data = new ContextMenuCommandBuilder().setName("Avatar").setType(ApplicationCommandType.User);

	async execute(context: ContextMenuContext) {
		const interaction = context.interaction;
		if (!interaction.isUserContextMenuCommand()) return;
		await interaction.reply({ content: interaction.targetUser.displayAvatarURL({ size: 1024 }), flags: MessageFlags.Ephemeral });
	}
}
