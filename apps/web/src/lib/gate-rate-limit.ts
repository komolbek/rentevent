/**
 * In-memory limiter for wrong site-gate codes. Pure (no Next imports) so it can be
 * checked without a framework. State lives per server instance: it slows brute force
 * down, it is not a global guarantee across restarts or replicas.
 */
export interface FailureLimiter {
  /** Seconds until `key` may try again, or 0 when it is not blocked. */
  retryAfter(key: string, now?: number): number;
  /** Records one wrong attempt for `key`. */
  recordFailure(key: string, now?: number): void;
}

export function createFailureLimiter(options: {
  max: number;
  windowMs: number;
  maxKeys?: number;
}): FailureLimiter {
  const { max, windowMs, maxKeys = 10_000 } = options;
  const failures = new Map<string, number[]>();

  const recent = (key: string, now: number): number[] => {
    const list = (failures.get(key) ?? []).filter((t) => now - t < windowMs);
    if (list.length) failures.set(key, list);
    else failures.delete(key);
    return list;
  };

  return {
    retryAfter(key, now = Date.now()) {
      const list = recent(key, now);
      if (list.length < max) return 0;
      return Math.max(1, Math.ceil((list[0] + windowMs - now) / 1000));
    },
    recordFailure(key, now = Date.now()) {
      if (!failures.has(key) && failures.size >= maxKeys) {
        for (const k of failures.keys()) recent(k, now);
        // Still full of live entries: drop the oldest key to stay bounded.
        if (failures.size >= maxKeys) {
          const oldest = failures.keys().next().value;
          if (oldest !== undefined) failures.delete(oldest);
        }
      }
      const list = recent(key, now);
      list.push(now);
      failures.set(key, list);
    },
  };
}

/**
 * The caller's IP, same rule as `apps/api/src/common/client-ip.ts`: behind Railway's
 * edge proxy the last X-Forwarded-For entry is the one the proxy appended; earlier
 * entries come from the client and can be forged.
 */
export function clientIpFromHeaders(headers: { get(name: string): string | null }): string {
  const last = headers.get('x-forwarded-for')?.split(',').pop()?.trim();
  return last || 'unknown';
}

export const GATE_MAX_FAILURES = 10;
export const GATE_WINDOW_MS = 15 * 60 * 1000;
