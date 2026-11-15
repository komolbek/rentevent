import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimitService } from './rate-limit.service';

const stores = (s: RateLimitService) =>
  (s as any).stores as Map<string, Map<string, { timestamps: number[] }>>;

describe('RateLimitService pruning', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('record() drops events older than the window', () => {
    const s = new RateLimitService();
    s.record('ns', 'k', 1000);
    s.record('ns', 'k', 1000);
    vi.advanceTimersByTime(1500);
    s.record('ns', 'k', 1000);
    expect(stores(s).get('ns')!.get('k')!.timestamps).toHaveLength(1);
  });

  it('count() prunes expired events and deletes empty keys', () => {
    const s = new RateLimitService();
    s.record('ns', 'k', 1000);
    expect(s.count('ns', 'k', 1000)).toBe(1);
    vi.advanceTimersByTime(1500);
    expect(s.count('ns', 'k', 1000)).toBe(0);
    expect(stores(s).get('ns')!.has('k')).toBe(false);
  });
});
