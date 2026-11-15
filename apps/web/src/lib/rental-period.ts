import { addDays } from 'date-fns';

/**
 * Longest rental, in days, both ends included. Mirrors MAX_RENTAL_DAYS in
 * apps/api/src/common/rental-period.ts: the API answers 400 for a longer
 * period (or one starting in the past), so keep the two in sync.
 */
export const MAX_RENTAL_DAYS = 90;

function midnight(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Last selectable day of a period that starts on `from`. */
export function maxRentalEnd(from: Date): Date {
  return addDays(midnight(from), MAX_RENTAL_DAYS - 1);
}

/**
 * The same rules the API applies: both dates valid, start today or later,
 * end not before start, at most MAX_RENTAL_DAYS days.
 */
export function isValidRentalPeriod(
  from: Date | null | undefined,
  to: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!from || !to) return false;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false;
  const s = midnight(from);
  const e = midnight(to);
  if (s < midnight(now)) return false;
  return e >= s && e <= maxRentalEnd(s);
}
