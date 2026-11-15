// The web app has no test runner and apps/api compiles every spec under its own rootDir,
// so the web limiter (pure, no framework imports) is loaded by path at run time.
import { beforeAll, describe, expect, it } from 'vitest';

interface Limiter {
  retryAfter(key: string, now?: number): number;
  recordFailure(key: string, now?: number): void;
}
interface GateModule {
  createFailureLimiter(o: { max: number; windowMs: number; maxKeys?: number }): Limiter;
  clientIpFromHeaders(h: { get(n: string): string | null }): string;
  GATE_MAX_FAILURES: number;
  GATE_WINDOW_MS: number;
}

let gate: GateModule;

beforeAll(async () => {
  // Typed as plain string so tsc does not resolve (and emit) the web file.
  const path: string = '../../../web/src/lib/gate-rate-limit';
  gate = (await import(/* @vite-ignore */ path)) as GateModule;
});

describe('site-gate failure limiter', () => {
  const make = (maxKeys?: number) =>
    gate.createFailureLimiter({
      max: gate.GATE_MAX_FAILURES,
      windowMs: gate.GATE_WINDOW_MS,
      maxKeys,
    });

  it('is configured as 10 wrong codes per 15 minutes', () => {
    expect(gate.GATE_MAX_FAILURES).toBe(10);
    expect(gate.GATE_WINDOW_MS).toBe(15 * 60 * 1000);
  });

  it('allows max-1 wrong codes, blocks at max', () => {
    const l = make();
    for (let i = 0; i < gate.GATE_MAX_FAILURES - 1; i++) l.recordFailure('a', 1000 + i);
    expect(l.retryAfter('a', 2000)).toBe(0);
    l.recordFailure('a', 2000);
    expect(l.retryAfter('a', 3000)).toBeGreaterThan(0);
  });

  it('does not block other IPs', () => {
    const l = make();
    for (let i = 0; i < gate.GATE_MAX_FAILURES; i++) l.recordFailure('a', 1000);
    expect(l.retryAfter('b', 1000)).toBe(0);
  });

  it('unblocks after the window', () => {
    const l = make();
    for (let i = 0; i < gate.GATE_MAX_FAILURES; i++) l.recordFailure('a', 1000);
    expect(l.retryAfter('a', 1000 + gate.GATE_WINDOW_MS - 1)).toBe(1);
    expect(l.retryAfter('a', 1000 + gate.GATE_WINDOW_MS)).toBe(0);
  });

  it('stays bounded by maxKeys', () => {
    const l = make(2);
    for (let i = 0; i < gate.GATE_MAX_FAILURES; i++) l.recordFailure('a', 1000);
    l.recordFailure('b', 1000);
    l.recordFailure('c', 1000);
    // 'a' (oldest key) was evicted to make room
    expect(l.retryAfter('a', 1000)).toBe(0);
  });

  it('takes the last X-Forwarded-For entry, like the API', () => {
    expect(gate.clientIpFromHeaders(new Headers({ 'x-forwarded-for': '6.6.6.6, 1.2.3.4' }))).toBe('1.2.3.4');
    expect(gate.clientIpFromHeaders(new Headers())).toBe('unknown');
  });
});
