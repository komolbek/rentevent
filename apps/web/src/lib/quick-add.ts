import { isValidRentalPeriod } from './rental-period';

/** The slice of a cart line the quick-add rules need. */
export interface QuickAddLine {
  quantity: number;
  rentalStartDate: string;
  rentalEndDate: string;
  eventId?: string | null;
}

export interface QuickAddPeriod {
  from: Date;
  to: Date;
  /** Where the period came from: the cart wins, so a cart never holds two periods. */
  source: 'cart' | 'stored';
}

function parse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * The period a quick-add uses, or null when the visitor must pick one.
 * One period per order: a non-empty cart keeps its own period (first line);
 * otherwise the stored rental period; both must be valid today.
 */
export function resolveQuickAddPeriod(
  lines: QuickAddLine[],
  stored: { from: string | null; to: string | null },
  now: Date = new Date(),
): QuickAddPeriod | null {
  if (lines.length > 0) {
    const from = parse(lines[0].rentalStartDate);
    const to = parse(lines[0].rentalEndDate);
    if (from && to && isValidRentalPeriod(from, to, now)) return { from, to, source: 'cart' };
  }
  const from = parse(stored.from);
  const to = parse(stored.to ?? stored.from);
  if (from && to && isValidRentalPeriod(from, to, now)) return { from, to, source: 'stored' };
  return null;
}

/** Most units a card may put in the cart. */
export function quickAddCap(product: { availableStock?: number | null; totalStock: number }): number {
  return Math.max(0, product.availableStock ?? product.totalStock);
}

export type QuickAddAction =
  | { kind: 'add'; quantity: 1 }
  | { kind: 'set'; quantity: number }
  | { kind: 'remove' }
  | { kind: 'capped' }
  | { kind: 'none' };

/**
 * What a tap does. `inCart` is the current cart quantity (0 = not in cart).
 * Increments never call addItem (it replaces the line and would reset dates).
 */
export function quickAddStep(inCart: number, delta: 1 | -1, cap: number): QuickAddAction {
  if (delta === 1) {
    if (cap <= 0) return { kind: 'none' };
    if (inCart <= 0) return { kind: 'add', quantity: 1 };
    if (inCart >= cap) return { kind: 'capped' };
    return { kind: 'set', quantity: inCart + 1 };
  }
  if (inCart <= 0) return { kind: 'none' };
  if (inCart === 1) return { kind: 'remove' };
  return { kind: 'set', quantity: inCart - 1 };
}
