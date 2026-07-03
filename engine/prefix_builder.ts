import type { PrefixArg, PrefixArgKind } from "./types";

export class PrefixCommandBuilder {
	name = "";
	description = "";
	aliases: string[] = [];
	args: PrefixArg[] = [];

	set_name(name: string) {
		this.name = name.toLowerCase();
		return this;
	}

	set_description(description: string) {
		this.description = description;
		return this;
	}

	add_alias(...aliases: string[]) {
		this.aliases.push(...aliases.map((alias) => alias.toLowerCase()));
		return this;
	}

	private add_argument(kind: PrefixArgKind, name: string, description: string, required: boolean) {
		this.args.push({ name, kind, description, required });
		return this;
	}

	add_string(name: string, description: string, required = false) {
		return this.add_argument("string", name, description, required);
	}

	add_integer(name: string, description: string, required = false) {
		return this.add_argument("integer", name, description, required);
	}

	add_number(name: string, description: string, required = false) {
		return this.add_argument("number", name, description, required);
	}

	add_boolean(name: string, description: string, required = false) {
		return this.add_argument("boolean", name, description, required);
	}

	add_user(name: string, description: string, required = false) {
		return this.add_argument("user", name, description, required);
	}

	add_member(name: string, description: string, required = false) {
		return this.add_argument("member", name, description, required);
	}

	add_channel(name: string, description: string, required = false) {
		return this.add_argument("channel", name, description, required);
	}

	add_role(name: string, description: string, required = false) {
		return this.add_argument("role", name, description, required);
	}

	add_rest(name: string, description: string, required = false) {
		return this.add_argument("rest", name, description, required);
	}

	usage(prefix: string): string {
		const parts = this.args.map((argument) => (argument.required ? `<${argument.name}>` : `[${argument.name}]`));
		return [`${prefix}${this.name}`, ...parts].join(" ");
	}
}
