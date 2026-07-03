import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } from "discord.js";
import type { EmbedBuilder } from "discord.js";
import { reply_and_fetch, allowed_user } from "@/helpers/respond";
import type { Respondable } from "@/helpers/respond";

export type PaginateTarget = Respondable;

export interface PaginateOptions {
	timeout?: number;
	user_id?: string | null;
	ephemeral?: boolean;
	counter?: boolean;
	on_end?: "disable" | "remove";
	start?: number;
}

const BUTTONS = {
	first: "paginate_first",
	prev: "paginate_prev",
	counter: "paginate_counter",
	next: "paginate_next",
	last: "paginate_last",
} as const;

const LABELS = {
	first: "«",
	prev: "‹",
	next: "›",
	last: "»",
} as const;

export function next_index(action: string, index: number, total: number): number {
	switch (action) {
		case BUTTONS.first:
			return 0;
		case BUTTONS.prev:
			return Math.max(0, index - 1);
		case BUTTONS.next:
			return Math.min(total - 1, index + 1);
		case BUTTONS.last:
			return total - 1;
		default:
			return index;
	}
}

export function navigation_row(index: number, total: number, options: { counter?: boolean } = {}, disabled = false): ActionRowBuilder<ButtonBuilder> {
	const at_start = index <= 0;
	const at_end = index >= total - 1;
	const row = new ActionRowBuilder<ButtonBuilder>();

	row.addComponents(
		new ButtonBuilder()
			.setCustomId(BUTTONS.first)
			.setLabel(LABELS.first)
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(disabled || at_start),
		new ButtonBuilder()
			.setCustomId(BUTTONS.prev)
			.setLabel(LABELS.prev)
			.setStyle(ButtonStyle.Primary)
			.setDisabled(disabled || at_start)
	);

	if (options.counter !== false) {
		row.addComponents(
			new ButtonBuilder()
				.setCustomId(BUTTONS.counter)
				.setLabel(`${index + 1} / ${total}`)
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(true)
		);
	}

	row.addComponents(
		new ButtonBuilder()
			.setCustomId(BUTTONS.next)
			.setLabel(LABELS.next)
			.setStyle(ButtonStyle.Primary)
			.setDisabled(disabled || at_end),
		new ButtonBuilder()
			.setCustomId(BUTTONS.last)
			.setLabel(LABELS.last)
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(disabled || at_end)
	);

	return row;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export async function paginate(target: PaginateTarget, pages: EmbedBuilder[], options: PaginateOptions = {}): Promise<void> {
	if (pages.length === 0) {
		await reply_and_fetch(target, { content: "Nothing to display." }, options.ephemeral);
		return;
	}

	if (pages.length === 1) {
		await reply_and_fetch(target, { embeds: [pages[0]] }, options.ephemeral);
		return;
	}

	let index = clamp(options.start ?? 0, 0, pages.length - 1);
	const message = await reply_and_fetch(target, { embeds: [pages[index]], components: [navigation_row(index, pages.length, options)] }, options.ephemeral);

	const allowed = allowed_user(target, options.user_id);
	const collector = message.createMessageComponentCollector({
		componentType: ComponentType.Button,
		time: options.timeout ?? 120_000,
		filter: (interaction) => interaction.customId.startsWith("paginate_"),
	});

	collector.on("collect", async (interaction) => {
		if (allowed !== null && interaction.user.id !== allowed) {
			await interaction.reply({ content: "These controls aren't for you.", flags: MessageFlags.Ephemeral }).catch(() => undefined);
			return;
		}

		index = next_index(interaction.customId, index, pages.length);
		await interaction.update({ embeds: [pages[index]], components: [navigation_row(index, pages.length, options)] }).catch(() => undefined);
	});

	collector.on("end", async () => {
		if (options.on_end === "remove") {
			await message.edit({ components: [] }).catch(() => undefined);
			return;
		}
		await message.edit({ components: [navigation_row(index, pages.length, options, true)] }).catch(() => undefined);
	});
}
