import type { StorageAdapter } from "./adapter";

export class MemoryStorage implements StorageAdapter {
	private readonly data = new Map<string, Map<string, unknown>>();

	private bucket(namespace: string): Map<string, unknown> {
		let bucket = this.data.get(namespace);
		if (!bucket) {
			bucket = new Map();
			this.data.set(namespace, bucket);
		}
		return bucket;
	}

	get(namespace: string, key: string): unknown {
		return this.bucket(namespace).get(key);
	}

	has(namespace: string, key: string): boolean {
		return this.bucket(namespace).has(key);
	}

	set(namespace: string, key: string, value: unknown): void {
		this.bucket(namespace).set(key, value);
	}

	delete(namespace: string, key: string): void {
		this.bucket(namespace).delete(key);
	}

	all(namespace: string): Record<string, unknown> {
		return Object.fromEntries(this.bucket(namespace));
	}

	keys(namespace: string): string[] {
		return [...this.bucket(namespace).keys()];
	}

	clear(namespace: string): void {
		this.bucket(namespace).clear();
	}
}
