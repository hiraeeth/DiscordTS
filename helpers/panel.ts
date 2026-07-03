import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from "discord.js";
import type { BaseMessageOptions, EmbedBuilder, StringSelectMenuInteraction } from "discord.js";
import { embed } from "@/helpers/embeds";
import type { EmbedOptions } from "@/helpers/embeds";
import { reply_and_fetch, allowed_user } from "@/helpers/respond";
import type { Respondable } from "@/helpers/respond";

interface BaseSetting {
	key: string;
	label: string;
	description?: string;
}

export interface PanelChoice {
	label: string;
	value: string;
	description?: string;
}

export type PanelSetting =
	| (BaseSetting & { kind: "boolean"; get: () => boolean; set: (value: boolean) => void | Promise<void> })
	| (BaseSetting & { kind: "text"; get: () => string; set: (value: string) => void | Promise<void>; placeholder?: string; max?: number })
	| (BaseSetting & { kind: "number"; get: () => number; set: (value: number) => void | Promise<void>; min?: number; max?: number })
	| (BaseSetting & { kind: "choice"; get: () => string; set: (value: string) => void | Promise<void>; choices: PanelChoice[] });

type WritableSetting = Extract<PanelSetting, { kind: "text" | "number" }>;
type ChoiceSetting = Extract<PanelSetting, { kind: "choice" }>;

export interface PanelOptions {
	title?: string;
	description?: string;
	settings: PanelSetting[];
	color?: EmbedOptions["color"];
	user_id?: string | null;
	timeout?: number;
	ephemeral?: boolean;
}

export type PanelTarget = Respondable;

const CONTROLS = {
	select: "panel_select",
	choice: "panel_choice",
	cancel: "panel_cancel",
} as const;

function truncate(value: string, max: number): string {
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function format_value(setting: PanelSetting): string {
	switch (setting.kind) {
		case "boolean":
			return setting.get() ? "On" : "Off";
		case "choice": {
			const current = setting.get();
			const match = setting.choices.find((choice) => choice.value === current);
			return match ? match.label : current;
		}
		case "number":
			return String(setting.get());
		case "text": {
			const value = setting.get();
			return value.length > 0 ? value : "—";
		}
		default:
			return "—";
	}
}

export function setting_options(settings: PanelSetting[]): StringSelectMenuOptionBuilder[] {
	return settings.map((setting) =>
		new StringSelectMenuOptionBuilder()
			.setLabel(setting.label)
			.setValue(setting.key)
			.setDescription(truncate(setting.description ?? format_value(setting), 100))
	);
}

function panel_embed(options: PanelOptions): EmbedBuilder {
	return embed({
		title: options.title ?? "Settings",
		description: options.description,
		color: options.color,
		fields: options.settings.map((setting) => ({ name: setting.label, value: truncate(format_value(setting), 1024), inline: true })),
	});
}

function select_row(settings: PanelSetting[]): ActionRowBuilder<StringSelectMenuBuilder> {
	const menu = new StringSelectMenuBuilder().setCustomId(CONTROLS.select).setPlaceholder("Choose a setting to edit").addOptions(setting_options(settings));
	return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

function render(options: PanelOptions): BaseMessageOptions {
	return { embeds: [panel_embed(options)], components: [select_row(options.settings)] };
}

function choice_view(options: PanelOptions, setting: ChoiceSetting): BaseMessageOptions {
	const menu = new StringSelectMenuBuilder()
		.setCustomId(CONTROLS.choice)
		.setPlaceholder(`Set ${setting.label}`)
		.addOptions(
			setting.choices.map((choice) => {
				const option = new StringSelectMenuOptionBuilder()
					.setLabel(choice.label)
					.setValue(choice.value)
					.setDefault(choice.value === setting.get());
				if (choice.description) option.setDescription(truncate(choice.description, 100));
				return option;
			})
		);
	const cancel = new ButtonBuilder().setCustomId(CONTROLS.cancel).setLabel("Cancel").setStyle(ButtonStyle.Secondary);
	return {
		embeds: [panel_embed(options)],
		components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu), new ActionRowBuilder<ButtonBuilder>().addComponents(cancel)],
	};
}

async function edit_via_modal(interaction: StringSelectMenuInteraction, setting: WritableSetting, options: PanelOptions): Promise<void> {
	const modal_id = `panel_modal_${setting.key}`;
	const input = new TextInputBuilder()
		.setCustomId("value")
		.setLabel(truncate(setting.label, 45))
		.setStyle(TextInputStyle.Short)
		.setRequired(true)
		.setValue(truncate(String(setting.get()), 4000));

	if (setting.kind === "text") {
		if (setting.placeholder !== undefined) input.setPlaceholder(truncate(setting.placeholder, 100));
		if (setting.max !== undefined) input.setMaxLength(setting.max);
	}

	const modal = new ModalBuilder()
		.setCustomId(modal_id)
		.setTitle(truncate(`Edit ${setting.label}`, 45))
		.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
	await interaction.showModal(modal);

	const submitted = await interaction.awaitModalSubmit({ time: 60_000, filter: (event) => event.customId === modal_id && event.user.id === interaction.user.id }).catch(() => null);
	if (!submitted) return;

	const raw = submitted.fields.getTextInputValue("value").trim();

	if (setting.kind === "number") {
		const value = Number(raw);
		const below = setting.min !== undefined && value < setting.min;
		const above = setting.max !== undefined && value > setting.max;
		if (!Number.isFinite(value) || below || above) {
			await submitted.reply({ content: "Please enter a valid number within range.", flags: MessageFlags.Ephemeral }).catch(() => undefined);
			return;
		}
		await setting.set(value);
	} else {
		await setting.set(raw);
	}

	if (submitted.isFromMessage()) await submitted.update(render(options)).catch(() => undefined);
	else await submitted.reply({ content: "Saved.", flags: MessageFlags.Ephemeral }).catch(() => undefined);
}

export async function panel(target: PanelTarget, options: PanelOptions): Promise<void> {
	if (options.settings.length === 0) {
		await reply_and_fetch(target, { content: "No settings to configure." }, options.ephemeral);
		return;
	}

	const message = await reply_and_fetch(target, render(options), options.ephemeral);
	const allowed = allowed_user(target, options.user_id);

	let editing: ChoiceSetting | null = null;
	const collector = message.createMessageComponentCollector({ time: options.timeout ?? 120_000, filter: (interaction) => interaction.customId.startsWith("panel_") });

	collector.on("collect", async (interaction) => {
		if (allowed !== null && interaction.user.id !== allowed) {
			await interaction.reply({ content: "This panel isn't yours.", flags: MessageFlags.Ephemeral }).catch(() => undefined);
			return;
		}

		if (interaction.isButton() && interaction.customId === CONTROLS.cancel) {
			editing = null;
			await interaction.update(render(options)).catch(() => undefined);
			return;
		}

		if (!interaction.isStringSelectMenu()) return;

		if (interaction.customId === CONTROLS.choice) {
			if (editing === null) return;
			await editing.set(interaction.values[0]);
			editing = null;
			await interaction.update(render(options)).catch(() => undefined);
			return;
		}

		const setting = options.settings.find((entry) => entry.key === interaction.values[0]);
		if (setting === undefined) return;

		if (setting.kind === "boolean") {
			await setting.set(!setting.get());
			await interaction.update(render(options)).catch(() => undefined);
			return;
		}

		if (setting.kind === "choice") {
			editing = setting;
			await interaction.update(choice_view(options, setting)).catch(() => undefined);
			return;
		}

		await edit_via_modal(interaction, setting, options);
	});

	collector.on("end", async () => {
		await message.edit({ components: [] }).catch(() => undefined);
	});
}
