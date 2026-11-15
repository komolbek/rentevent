import { BadRequestException } from '@nestjs/common';

/** Longest rental, in days, both ends included. Bounds every per-day loop. */
export const MAX_RENTAL_DAYS = 90;

const DAY_MS = 1000 * 60 * 60 * 24;

/**
 * Validates a rental period given as date strings and returns it as local
 * midnights. Same rules as order creation: valid dates, start today or
 * later, end not before start, at most MAX_RENTAL_DAYS days. Throws 400.
 * Pure date arithmetic, so it is safe to run before any DB query.
 */
export function validateRentalPeriod(
  start: string,
  end: string,
  now: Date = new Date(),
): { start: Date; end: Date; days: number } {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    throw new BadRequestException('Invalid date format');
  }
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (s < today) {
    throw new BadRequestException('Start date must be today or later');
  }
  if (e < s) {
    throw new BadRequestException('End date must not be before start date');
  }
  const days = Math.round((e.getTime() - s.getTime()) / DAY_MS) + 1;
  if (days > MAX_RENTAL_DAYS) {
    throw new BadRequestException(`Period can be at most ${MAX_RENTAL_DAYS} days`);
  }
  return { start: s, end: e, days };
}
