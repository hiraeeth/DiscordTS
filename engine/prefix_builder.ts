import type { PrefixArg, PrefixArgKind } from "./types";

export class PrefixCommandBuilder {
	name = "";
	description = "";
	aliases: string[] = [];
	args: PrefixArg[] = [];

	setName(name: string) {
		this.name = name.toLowerCase();
		return this;
	}

	setDescription(description: string) {
		this.description = description;
		return this;
	}

	addAlias(...aliases: string[]) {
		this.aliases.push(...aliases.map((alias) => alias.toLowerCase()));
		return this;
	}

	private add_argument(kind: PrefixArgKind, name: string, description: string, required: boolean) {
		this.args.push({ name, kind, description, required });
		return this;
	}

	addString(name: string, description: string, required = false) {
		return this.add_argument("string", name, description, required);
	}

	addInteger(name: string, description: string, required = false) {
		return this.add_argument("integer", name, description, required);
	}

	addNumber(name: string, description: string, required = false) {
		return this.add_argument("number", name, description, required);
	}

	addBoolean(name: string, description: string, required = false) {
		return this.add_argument("boolean", name, description, required);
	}

	addUser(name: string, description: string, required = false) {
		return this.add_argument("user", name, description, required);
	}

	addMember(name: string, description: string, required = false) {
		return this.add_argument("member", name, description, required);
	}

	addChannel(name: string, description: string, required = false) {
		return this.add_argument("channel", name, description, required);
	}

	addRole(name: string, description: string, required = false) {
		return this.add_argument("role", name, description, required);
	}

	addRest(name: string, description: string, required = false) {
		return this.add_argument("rest", name, description, required);
	}

	usage(prefix: string): string {
		const parts = this.args.map((argument) => (argument.required ? `<${argument.name}>` : `[${argument.name}]`));
		return [`${prefix}${this.name}`, ...parts].join(" ");
	}
}
