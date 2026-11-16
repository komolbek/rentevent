import { describe, it, expect } from 'vitest';
import { resolveQuickAddPeriod, quickAddCap, quickAddStep } from './quick-add';

const NOW = new Date('2026-11-16T10:00:00');
const iso = (s: string) => new Date(`${s}T00:00:00`).toISOString();

describe('resolveQuickAddPeriod', () => {
  it('returns null with no cart and no stored period', () => {
    expect(resolveQuickAddPeriod([], { from: null, to: null }, NOW)).toBeNull();
  });
  it('uses the stored period when the cart is empty', () => {
    const p = resolveQuickAddPeriod([], { from: iso('2026-11-20'), to: iso('2026-11-22') }, NOW);
    expect(p?.source).toBe('stored');
  });
  it('keeps the cart period over a different stored one', () => {
    const line = { quantity: 1, rentalStartDate: iso('2026-12-01'), rentalEndDate: iso('2026-12-03') };
    const p = resolveQuickAddPeriod([line], { from: iso('2026-11-20'), to: iso('2026-11-22') }, NOW);
    expect(p?.source).toBe('cart');
    expect(p?.from.toISOString()).toBe(line.rentalStartDate);
  });
  it('drops a stale stored period', () => {
    expect(resolveQuickAddPeriod([], { from: iso('2026-11-10'), to: iso('2026-11-12') }, NOW)).toBeNull();
  });
  it('falls back to the stored period when the cart one is stale', () => {
    const line = { quantity: 1, rentalStartDate: iso('2026-11-01'), rentalEndDate: iso('2026-11-02') };
    const p = resolveQuickAddPeriod([line], { from: iso('2026-11-20'), to: iso('2026-11-20') }, NOW);
    expect(p?.source).toBe('stored');
  });
  it('rejects a period over 90 days', () => {
    expect(resolveQuickAddPeriod([], { from: iso('2026-11-20'), to: iso('2027-03-20') }, NOW)).toBeNull();
  });
});

describe('quickAddCap', () => {
  it('prefers availableStock, falls back to totalStock', () => {
    expect(quickAddCap({ availableStock: 2, totalStock: 9 })).toBe(2);
    expect(quickAddCap({ totalStock: 9 })).toBe(9);
    expect(quickAddCap({ availableStock: 0, totalStock: 9 })).toBe(0);
  });
});

describe('quickAddStep', () => {
  it('adds the first unit, then steps up to the cap', () => {
    expect(quickAddStep(0, 1, 3)).toEqual({ kind: 'add', quantity: 1 });
    expect(quickAddStep(1, 1, 3)).toEqual({ kind: 'set', quantity: 2 });
    expect(quickAddStep(3, 1, 3)).toEqual({ kind: 'capped' });
  });
  it('does nothing without stock', () => {
    expect(quickAddStep(0, 1, 0)).toEqual({ kind: 'none' });
  });
  it('stock 1: add once, then capped', () => {
    expect(quickAddStep(0, 1, 1)).toEqual({ kind: 'add', quantity: 1 });
    expect(quickAddStep(1, 1, 1)).toEqual({ kind: 'capped' });
  });
  it('minus steps down and removes at 1', () => {
    expect(quickAddStep(3, -1, 5)).toEqual({ kind: 'set', quantity: 2 });
    expect(quickAddStep(1, -1, 5)).toEqual({ kind: 'remove' });
    expect(quickAddStep(0, -1, 5)).toEqual({ kind: 'none' });
  });
});

import { calculatePrice } from './utils';
import { quickAddOutcome } from './quick-add';

describe('catalog list products have no pricing tiers (fair + bug)', () => {
  it('calculatePrice does not throw on missing tiers and uses the base price', () => {
    // list items arrive without tiers at runtime (undefined)
    const r = calculatePrice(100, 3, 2, undefined, undefined);
    expect(r).toEqual({ totalPrice: 600, dailyPriceUsed: 100, savings: 0 });
  });
});

describe('quickAddOutcome: every tap does something visible', () => {
  const period = { from: new Date(), to: new Date(), source: 'stored' as const };
  const cases: [number, 1 | -1, number, typeof period | null, string | null][] = [
    [0, 1, 1, period, 'add'],
    [0, 1, 1, null, 'pick_dates'],
    [0, 1, 0, period, 'message'],
    [1, 1, 1, period, 'message'],
    [1, 1, 3, period, 'set'],
    [2, -1, 3, period, 'set'],
    [1, -1, 3, period, 'remove'],
  ];
  it.each(cases)('inCart %i delta %i cap %i', (inCart, delta, cap, p, kind) => {
    expect(quickAddOutcome(inCart, delta, cap, p, { from: null }).kind).toBe(kind);
  });
  it('a stored but unbookable period opens the picker with a message', () => {
    expect(quickAddOutcome(0, 1, 1, null, { from: '2026-11-01T00:00:00.000Z' })).toEqual({ kind: 'pick_dates', stale: true });
    expect(quickAddOutcome(0, 1, 1, null, { from: null })).toEqual({ kind: 'pick_dates', stale: false });
  });
  it('only an unreachable "−" with nothing in the cart is a no-op', () => {
    expect(quickAddOutcome(0, -1, 1, period, { from: null }).kind).toBe('noop');
  });
});
