import type {
	Client,
	Interaction,
	ButtonInteraction,
	ModalSubmitInteraction,
	AnySelectMenuInteraction,
	StringSelectMenuInteraction,
	UserSelectMenuInteraction,
	RoleSelectMenuInteraction,
	ChannelSelectMenuInteraction,
	MentionableSelectMenuInteraction,
} from "discord.js";
import type { ComponentKind } from "../types";

export abstract class Component<I extends Interaction = Interaction> {
	client!: Client;
	id = "";

	abstract readonly kind: ComponentKind;
	abstract execute(interaction: I): Promise<void>;
}

export abstract class ButtonComponent extends Component<ButtonInteraction> {
	readonly kind = "button" as const;
}

export abstract class ModalComponent extends Component<ModalSubmitInteraction> {
	readonly kind = "modal" as const;
}

export abstract class SelectComponent extends Component<AnySelectMenuInteraction> {
	readonly kind = "select" as const;
}

export abstract class StringSelectComponent extends Component<StringSelectMenuInteraction> {
	readonly kind = "select" as const;
}

export abstract class UserSelectComponent extends Component<UserSelectMenuInteraction> {
	readonly kind = "select" as const;
}

export abstract class RoleSelectComponent extends Component<RoleSelectMenuInteraction> {
	readonly kind = "select" as const;
}

export abstract class ChannelSelectComponent extends Component<ChannelSelectMenuInteraction> {
	readonly kind = "select" as const;
}

export abstract class MentionableSelectComponent extends Component<MentionableSelectMenuInteraction> {
	readonly kind = "select" as const;
}
