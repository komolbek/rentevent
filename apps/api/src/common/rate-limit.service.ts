import { Injectable } from '@nestjs/common';

interface RateLimitEntry {
  timestamps: number[];
}

@Injectable()
export class RateLimitService {
  private stores = new Map<string, Map<string, RateLimitEntry>>();

  private getStore(namespace: string): Map<string, RateLimitEntry> {
    let store = this.stores.get(namespace);
    if (!store) {
      store = new Map();
      this.stores.set(namespace, store);
    }
    return store;
  }

  /** Counts events in the window without recording a new one. */
  count(namespace: string, key: string, windowMs: number): number {
    const entry = this.getStore(namespace).get(key);
    if (!entry) return 0;
    const windowStart = Date.now() - windowMs;
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
    if (entry.timestamps.length === 0) {
      this.getStore(namespace).delete(key);
      return 0;
    }
    return entry.timestamps.length;
  }

  /** Records one event without checking any limit; drops events older than the window. */
  record(namespace: string, key: string, windowMs: number): void {
    const store = this.getStore(namespace);
    const now = Date.now();
    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }
    entry.timestamps = entry.timestamps.filter((t) => t > now - windowMs);
    entry.timestamps.push(now);
  }

  /** Ms until the oldest event in the window expires (0 when there are none). */
  retryAfterMs(namespace: string, key: string, windowMs: number): number {
    const entry = this.getStore(namespace).get(key);
    if (!entry) return 0;
    const now = Date.now();
    const inWindow = entry.timestamps.filter((t) => t > now - windowMs);
    if (inWindow.length === 0) return 0;
    return Math.max(0, Math.min(...inWindow) + windowMs - now);
  }

  check(
    namespace: string,
    key: string,
    maxRequests: number,
    windowMs: number,
  ): { allowed: boolean; remaining: number; retryAfterMs: number } {
    const store = this.getStore(namespace);
    const now = Date.now();
    const windowStart = now - windowMs;

    let entry = store.get(key);
    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length >= maxRequests) {
      const oldestInWindow = entry.timestamps[0];
      const retryAfterMs = oldestInWindow + windowMs - now;
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    entry.timestamps.push(now);
    return {
      allowed: true,
      remaining: maxRequests - entry.timestamps.length,
      retryAfterMs: 0,
    };
  }
}
