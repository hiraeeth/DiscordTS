interface Window {
	count: number;
	reset: number;
}

export interface RateLimitResult {
	allowed: boolean;
	retry_after: number;
}

export class RateLimiter {
	private readonly windows = new Map<string, Window>();

	hit(key: string, max: number, window_ms: number): RateLimitResult {
		const now = Date.now();
		const window = this.windows.get(key);

		if (window === undefined || now >= window.reset) {
			this.windows.set(key, { count: 1, reset: now + window_ms });
			return { allowed: true, retry_after: 0 };
		}

		if (window.count < max) {
			window.count += 1;
			return { allowed: true, retry_after: 0 };
		}

		return { allowed: false, retry_after: Math.max(0, window.reset - now) };
	}

	clear(key?: string): void {
		if (key === undefined) this.windows.clear();
		else this.windows.delete(key);
	}
}

export const rate_limiter = new RateLimiter();
