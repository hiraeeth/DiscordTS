import { EmbedBuilder } from "discord.js";
import type { ColorResolvable } from "discord.js";
import { config } from "config";
import { Color, color } from "@/helpers/color";

export const EMBED_COLORS = {
	brand: config.accent,
	success: color("#57f287"),
	error: color("#ed4245"),
	warning: color("#fee75c"),
	info: color("#3498db"),
	neutral: color("#2b2d31"),
};

function resolve_color(value: Color | ColorResolvable | undefined): ColorResolvable {
	if (value === undefined) return EMBED_COLORS.brand.int;
	return value instanceof Color ? value.int : value;
}

export interface EmbedField {
	name: string;
	value: string;
	inline?: boolean;
}

export interface EmbedOptions {
	title?: string;
	url?: string;
	description?: string;
	color?: Color | ColorResolvable;
	fields?: EmbedField[];
	author?: string | { name: string; url?: string; icon?: string };
	footer?: string | { text: string; icon?: string };
	thumbnail?: string;
	image?: string;
	timestamp?: boolean | number | Date;
}

export function embed(options: EmbedOptions): EmbedBuilder {
	const builder = new EmbedBuilder().setColor(resolve_color(options.color));

	if (options.title !== undefined) builder.setTitle(options.title);
	if (options.url !== undefined) builder.setURL(options.url);
	if (options.description !== undefined) builder.setDescription(options.description);
	if (options.fields !== undefined && options.fields.length > 0) builder.addFields(options.fields);
	if (options.thumbnail !== undefined) builder.setThumbnail(options.thumbnail);
	if (options.image !== undefined) builder.setImage(options.image);

	if (options.author !== undefined) {
		const author = typeof options.author === "string" ? { name: options.author } : { name: options.author.name, url: options.author.url, iconURL: options.author.icon };
		builder.setAuthor(author);
	}

	if (options.footer !== undefined) {
		const footer = typeof options.footer === "string" ? { text: options.footer } : { text: options.footer.text, iconURL: options.footer.icon };
		builder.setFooter(footer);
	}

	if (options.timestamp === true) builder.setTimestamp();
	else if (options.timestamp !== undefined && options.timestamp !== false) builder.setTimestamp(options.timestamp);

	return builder;
}

function preset(input: string | EmbedOptions, tone: Color): EmbedOptions {
	const base = typeof input === "string" ? { description: input } : input;
	return { color: tone, ...base };
}

export function success(input: string | EmbedOptions): EmbedBuilder {
	return embed(preset(input, EMBED_COLORS.success));
}

export function error(input: string | EmbedOptions): EmbedBuilder {
	return embed(preset(input, EMBED_COLORS.error));
}

export function warning(input: string | EmbedOptions): EmbedBuilder {
	return embed(preset(input, EMBED_COLORS.warning));
}

export function info(input: string | EmbedOptions): EmbedBuilder {
	return embed(preset(input, EMBED_COLORS.info));
}

export function neutral(input: string | EmbedOptions): EmbedBuilder {
	return embed(preset(input, EMBED_COLORS.neutral));
}

function chunk<T>(items: T[], size: number): T[][] {
	const groups: T[][] = [];
	for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
	return groups;
}

function footer_for(base: EmbedOptions | undefined, page: number, total: number, counter?: boolean): EmbedOptions["footer"] {
	if (counter === false) return base?.footer;
	return `Page ${page}/${total}`;
}

export interface FieldPageOptions<T> {
	render: (item: T, index: number) => EmbedField;
	per_page?: number;
	base?: EmbedOptions;
	counter?: boolean;
}

export function fields_to_pages<T>(items: T[], options: FieldPageOptions<T>): EmbedBuilder[] {
	const size = Math.min(Math.max(options.per_page ?? 10, 1), 25);
	const groups = chunk(items, size);
	if (groups.length === 0) return [embed({ ...options.base })];

	const total = groups.length;
	return groups.map((group, page) => {
		const start = page * size;
		const fields = group.map((item, offset) => options.render(item, start + offset));
		return embed({ ...options.base, fields, footer: footer_for(options.base, page + 1, total, options.counter) });
	});
}

export interface LinePageOptions {
	per_page?: number;
	base?: EmbedOptions;
	counter?: boolean;
	separator?: string;
}

export function lines_to_pages(lines: string[], options: LinePageOptions = {}): EmbedBuilder[] {
	const size = Math.max(options.per_page ?? 10, 1);
	const groups = chunk(lines, size);
	if (groups.length === 0) return [embed({ ...options.base })];

	const total = groups.length;
	const joiner = options.separator ?? "\n";
	return groups.map((group, page) => embed({ ...options.base, description: group.join(joiner), footer: footer_for(options.base, page + 1, total, options.counter) }));
}
