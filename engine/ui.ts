import {
	ActionRowBuilder,
	ButtonBuilder,
	ContainerBuilder,
	FileBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	SectionBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
	ThumbnailBuilder,
	MessageFlags,
} from "discord.js";
import type { InteractionReplyOptions, MessageActionRowComponentBuilder } from "discord.js";

export { ActionRowBuilder, ButtonBuilder, ContainerBuilder, FileBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SectionBuilder, SeparatorBuilder, TextDisplayBuilder, ThumbnailBuilder };

export type ActionRow = ActionRowBuilder<MessageActionRowComponentBuilder>;

export type ContainerChild = TextDisplayBuilder | SectionBuilder | SeparatorBuilder | MediaGalleryBuilder | FileBuilder | ActionRow;

export type TopLevelComponent = ContainerBuilder | ContainerChild;

export function text(content: string): TextDisplayBuilder {
	return new TextDisplayBuilder().setContent(content);
}

export function separator(options: { divider?: boolean; spacing?: SeparatorSpacingSize } = {}): SeparatorBuilder {
	const builder = new SeparatorBuilder();
	if (options.divider !== undefined) builder.setDivider(options.divider);
	if (options.spacing !== undefined) builder.setSpacing(options.spacing);
	return builder;
}

export function thumbnail(url: string, description?: string): ThumbnailBuilder {
	const builder = new ThumbnailBuilder().setURL(url);
	if (description !== undefined) builder.setDescription(description);
	return builder;
}

export function file(url: string, spoiler = false): FileBuilder {
	return new FileBuilder().setURL(url).setSpoiler(spoiler);
}

export function gallery(...urls: string[]): MediaGalleryBuilder {
	return new MediaGalleryBuilder().addItems(...urls.map((url) => new MediaGalleryItemBuilder().setURL(url)));
}

export function section(lines: string[], accessory: ThumbnailBuilder | ButtonBuilder): SectionBuilder {
	const builder = new SectionBuilder();
	for (const line of lines) builder.addTextDisplayComponents(text(line));
	if (accessory instanceof ThumbnailBuilder) builder.setThumbnailAccessory(accessory);
	else builder.setButtonAccessory(accessory);
	return builder;
}

export function container(...children: ContainerChild[]): ContainerBuilder {
	const builder = new ContainerBuilder();
	for (const child of children) {
		if (child instanceof TextDisplayBuilder) builder.addTextDisplayComponents(child);
		else if (child instanceof SectionBuilder) builder.addSectionComponents(child);
		else if (child instanceof SeparatorBuilder) builder.addSeparatorComponents(child);
		else if (child instanceof MediaGalleryBuilder) builder.addMediaGalleryComponents(child);
		else if (child instanceof FileBuilder) builder.addFileComponents(child);
		else builder.addActionRowComponents(child);
	}
	return builder;
}

export function view(...components: TopLevelComponent[]): Pick<InteractionReplyOptions, "flags" | "components"> {
	return { flags: MessageFlags.IsComponentsV2, components };
}
