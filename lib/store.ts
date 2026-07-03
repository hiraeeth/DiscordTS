import { storage } from "@/lib/storage";

export class Store<T> {
	constructor(private readonly name: string) {}

	get(key: string): T | undefined {
		return storage().get(this.name, key) as T | undefined;
	}

	has(key: string): boolean {
		return storage().has(this.name, key);
	}

	set(key: string, value: T): void {
		storage().set(this.name, key, value);
	}

	delete(key: string): void {
		storage().delete(this.name, key);
	}

	all(): Record<string, T> {
		return storage().all(this.name) as Record<string, T>;
	}

	keys(): string[] {
		return storage().keys(this.name);
	}

	clear(): void {
		storage().clear(this.name);
	}

	reload(): void {
		storage().reload?.(this.name);
	}
}

export function store<T>(name: string): Store<T> {
	return new Store<T>(name);
}
