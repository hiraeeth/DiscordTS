import type { Client } from "discord.js";
import type { ContextMenuData, ContextMenuContext } from "../types";

export abstract class BaseContextMenu {
	client!: Client;
	globals: Record<string, unknown> = {};

	abstract data: ContextMenuData;
	abstract execute(context: ContextMenuContext): Promise<void>;
}
