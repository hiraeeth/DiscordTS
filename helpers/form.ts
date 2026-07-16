import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } from "discord.js";
import type { CommandInteraction, MessageComponentInteraction, ModalSubmitInteraction } from "discord.js";

export type FormTarget = CommandInteraction | MessageComponentInteraction;

export interface FormField {
	key: string;
	label: string;
	kind?: "text" | "number";
	style?: "short" | "paragraph";
	placeholder?: string;
	value?: string;
	required?: boolean;
	min?: number;
	max?: number;
}

export interface FormOptions {
	title: string;
	fields: FormField[];
	timeout?: number;
	custom_id?: string;
}

export interface FormResult {
	values: Record<string, string | number>;
	interaction: ModalSubmitInteraction;
}

let counter = 0;

function truncate(value: string, max: number): string {
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function coerce_field(field: FormField, raw: string): { ok: true; value: string | number | undefined } | { ok: false; error: string } {
	const trimmed = raw.trim();

	if (field.kind === "number") {
		if (trimmed.length === 0 && field.required !== true) return { ok: true, value: undefined };
		const value = Number(trimmed);
		if (!Number.isFinite(value)) return { ok: false, error: `\`${field.label}\` must be a number.` };
		if (field.min !== undefined && value < field.min) return { ok: false, error: `\`${field.label}\` must be at least ${field.min}.` };
		if (field.max !== undefined && value > field.max) return { ok: false, error: `\`${field.label}\` must be at most ${field.max}.` };
		return { ok: true, value };
	}

	return { ok: true, value: trimmed };
}

export async function form(target: FormTarget, options: FormOptions): Promise<FormResult | null> {
	const id = options.custom_id ?? `form_${(counter += 1)}`;
	const fields = options.fields.slice(0, 5);
	const modal = new ModalBuilder().setCustomId(id).setTitle(truncate(options.title, 45));

	for (const field of fields) {
		const input = new TextInputBuilder()
			.setCustomId(field.key)
			.setLabel(truncate(field.label, 45))
			.setStyle(field.style === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short)
			.setRequired(field.required ?? false);

		if (field.placeholder !== undefined) input.setPlaceholder(truncate(field.placeholder, 100));
		if (field.value !== undefined) input.setValue(field.value);
		if (field.kind !== "number") {
			if (field.min !== undefined) input.setMinLength(field.min);
			if (field.max !== undefined) input.setMaxLength(field.max);
		}

		modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
	}

	await target.showModal(modal);

	const submitted = await target.awaitModalSubmit({ time: options.timeout ?? 120_000, filter: (event) => event.customId === id && event.user.id === target.user.id }).catch(() => null);
	if (!submitted) return null;

	const values: Record<string, string | number> = {};
	for (const field of fields) {
		const result = coerce_field(field, submitted.fields.getTextInputValue(field.key));
		if (!result.ok) {
			await submitted.reply({ content: result.error, flags: MessageFlags.Ephemeral }).catch(() => undefined);
			return null;
		}
		if (result.value !== undefined) values[field.key] = result.value;
	}

	return { values, interaction: submitted };
}
