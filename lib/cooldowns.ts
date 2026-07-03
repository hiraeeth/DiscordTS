export type CooldownScope = "user" | "guild" | "channel" | "global";

export class Cooldowns {
	private readonly expiries = new Map<string, number>();

	remaining(bucket: string): number {
		const until = this.expiries.get(bucket);
		if (until === undefined) return 0;

		const left = until - Date.now();
		if (left <= 0) {
			this.expiries.delete(bucket);
			return 0;
		}
		return left;
	}

	start(bucket: string, ms: number): void {
		this.expiries.set(bucket, Date.now() + ms);
	}

	consume(bucket: string, ms: number): number {
		const left = this.remaining(bucket);
		if (left > 0) return left;
		this.start(bucket, ms);
		return 0;
	}

	clear(bucket?: string): void {
		if (bucket === undefined) this.expiries.clear();
		else this.expiries.delete(bucket);
	}
}

export interface CooldownSource {
	user: string;
	guild: string | null;
	channel: string | null;
}

export function cooldown_scope_id(scope: CooldownScope, source: CooldownSource): string {
	switch (scope) {
		case "guild":
			return source.guild ?? source.user;
		case "channel":
			return source.channel ?? source.user;
		case "global":
			return "global";
		default:
			return source.user;
	}
}

export function cooldown_bucket(kind: string, name: string, scope: CooldownScope, source: CooldownSource): string {
	return `${kind}:${name}:${scope}:${cooldown_scope_id(scope, source)}`;
}

export const cooldowns = new Cooldowns();
