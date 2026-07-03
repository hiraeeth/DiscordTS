import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from "discord.js";
import type { BaseMessageOptions, EmbedBuilder } from "discord.js";
import { embed, EMBED_COLORS } from "@/helpers/embeds";
import type { EmbedOptions } from "@/helpers/embeds";
import { reply_and_fetch, allowed_user } from "@/helpers/respond";
import type { Respondable } from "@/helpers/respond";

export type DialogButtonStyle = "primary" | "secondary" | "success" | "danger";

export interface DialogButton {
	id: string;
	label: string;
	style?: DialogButtonStyle;
	value?: string;
}

export interface DialogOptions {
	title?: string;
	description?: string;
	color?: EmbedOptions["color"];
	buttons: DialogButton[];
	user_id?: string | null;
	timeout?: number;
	ephemeral?: boolean;
}

export type DialogTarget = Respondable;

function resolve_style(style?: DialogButtonStyle): ButtonStyle {
	switch (style) {
		case "secondary":
			return ButtonStyle.Secondary;
		case "success":
			return ButtonStyle.Success;
		case "danger":
			return ButtonStyle.Danger;
		default:
			return ButtonStyle.Primary;
	}
}

function custom_id(button: DialogButton): string {
	return `dialog_${button.id}`;
}

export function dialog_row(buttons: DialogButton[], disabled = false): ActionRowBuilder<ButtonBuilder> {
	const row = new ActionRowBuilder<ButtonBuilder>();
	for (const button of buttons) {
		row.addComponents(new ButtonBuilder().setCustomId(custom_id(button)).setLabel(button.label).setStyle(resolve_style(button.style)).setDisabled(disabled));
	}
	return row;
}

function dialog_embed(options: DialogOptions): EmbedBuilder {
	return embed({ title: options.title, description: options.description, color: options.color });
}

function dialog_message(options: DialogOptions, disabled: boolean): BaseMessageOptions {
	const embeds = options.title !== undefined || options.description !== undefined ? [dialog_embed(options)] : [];
	return { embeds, components: [dialog_row(options.buttons, disabled)] };
}

export async function dialog(target: DialogTarget, options: DialogOptions): Promise<string | null> {
	const message = await reply_and_fetch(target, dialog_message(options, false), options.ephemeral);
	const allowed = allowed_user(target, options.user_id);

	return await new Promise<string | null>((resolve) => {
		let chosen: string | null = null;
		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: options.timeout ?? 60_000,
			filter: (interaction) => interaction.customId.startsWith("dialog_"),
		});

		collector.on("collect", async (interaction) => {
			if (allowed !== null && interaction.user.id !== allowed) {
				await interaction.reply({ content: "This prompt isn't yours.", flags: MessageFlags.Ephemeral }).catch(() => undefined);
				return;
			}

			const button = options.buttons.find((entry) => custom_id(entry) === interaction.customId);
			chosen = button ? (button.value ?? button.id) : null;
			await interaction.update(dialog_message(options, true)).catch(() => undefined);
			collector.stop("chosen");
		});

		collector.on("end", () => {
			if (chosen === null) message.edit(dialog_message(options, true)).catch(() => undefined);
			resolve(chosen);
		});
	});
}

export interface ConfirmOptions {
	title?: string;
	description?: string;
	confirm_label?: string;
	cancel_label?: string;
	danger?: boolean;
	color?: EmbedOptions["color"];
	user_id?: string | null;
	timeout?: number;
	ephemeral?: boolean;
}

export async function confirm(target: DialogTarget, options: ConfirmOptions = {}): Promise<boolean> {
	const chosen = await dialog(target, {
		title: options.title ?? "Are you sure?",
		description: options.description,
		color: options.color ?? (options.danger ? EMBED_COLORS.error : EMBED_COLORS.warning),
		buttons: [
			{ id: "confirm", label: options.confirm_label ?? "Confirm", style: options.danger ? "danger" : "success" },
			{ id: "cancel", label: options.cancel_label ?? "Cancel", style: "secondary" },
		],
		user_id: options.user_id,
		timeout: options.timeout,
		ephemeral: options.ephemeral,
	});
	return chosen === "confirm";
}

export interface AlertOptions {
	title?: string;
	description?: string;
	label?: string;
	color?: EmbedOptions["color"];
	user_id?: string | null;
	timeout?: number;
	ephemeral?: boolean;
}

export async function alert(target: DialogTarget, options: AlertOptions = {}): Promise<void> {
	await dialog(target, {
		title: options.title ?? "Notice",
		description: options.description,
		color: options.color ?? EMBED_COLORS.info,
		buttons: [{ id: "ok", label: options.label ?? "Dismiss", style: "primary" }],
		user_id: options.user_id,
		timeout: options.timeout,
		ephemeral: options.ephemeral,
	});
}
