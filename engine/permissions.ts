import { GuildMember, PermissionsBitField } from "discord.js";
import type { PermissionsString } from "discord.js";

export type Permission = PermissionsString;

export type PermissionHolder = GuildMember | Readonly<PermissionsBitField> | null | undefined;

function resolve(holder: PermissionHolder): Readonly<PermissionsBitField> | null {
	if (!holder) return null;
	if (holder instanceof GuildMember) return holder.permissions;
	return holder;
}

export class Permissions {
	private readonly bits: Readonly<PermissionsBitField> | null;

	constructor(holder: PermissionHolder) {
		this.bits = resolve(holder);
	}

	has(permission: Permission | Permission[]): boolean {
		return this.bits ? this.bits.has(permission) : false;
	}

	all(permissions: Permission[]): boolean {
		return this.has(permissions);
	}

	any(permissions: Permission[]): boolean {
		return this.bits ? permissions.some((permission) => this.bits!.has(permission)) : false;
	}

	missing(permission: Permission | Permission[]): Permission[] {
		if (!this.bits) return Array.isArray(permission) ? permission : [permission];
		return this.bits.missing(permission);
	}
}
