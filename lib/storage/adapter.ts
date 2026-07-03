export interface StorageAdapter {
	init?(): Promise<void>;
	get(namespace: string, key: string): unknown;
	set(namespace: string, key: string, value: unknown): void;
	delete(namespace: string, key: string): void;
	has(namespace: string, key: string): boolean;
	all(namespace: string): Record<string, unknown>;
	keys(namespace: string): string[];
	clear(namespace: string): void;
	reload?(namespace: string): void;
}

export type StorageDriver = "json" | "memory" | "custom";

export interface StorageConfig {
	driver: StorageDriver;
	adapter?: StorageAdapter;
}
