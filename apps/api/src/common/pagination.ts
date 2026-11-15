import { PipeTransform } from '@nestjs/common';

/** Max page size on public and customer endpoints. */
export const MAX_PAGE_LIMIT = 100;
/** Max page size on authenticated admin endpoints (the admin UI loads up to 300 at once). */
export const MAX_ADMIN_PAGE_LIMIT = 500;

/** Integer from a query value, or `fallback` when missing / not a number. */
function parseIntOr(raw: unknown, fallback: number): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? Math.trunc(raw) : fallback;
  if (typeof raw !== 'string' || !/^\s*-?\d+\s*$/.test(raw)) return fallback;
  const n = parseInt(raw, 10);
  return Number.isSafeInteger(n) ? n : fallback;
}

/** `page` >= 1; missing or non-numeric gives `fallback`. */
export function parsePage(raw: unknown, fallback = 1): number {
  return Math.max(1, parseIntOr(raw, fallback));
}

/** `limit` clamped to 1..max; missing or non-numeric gives `fallback`. */
export function parseLimit(raw: unknown, fallback: number, max = MAX_PAGE_LIMIT): number {
  const n = parseIntOr(raw, fallback);
  return Math.min(max, Math.max(1, n));
}

/** Query pipe for `page`: never throws. */
export class PagePipe implements PipeTransform {
  constructor(private readonly fallback = 1) {}
  transform(value: unknown): number {
    return parsePage(value, this.fallback);
  }
}

/** Query pipe for `limit`: never throws. */
export class LimitPipe implements PipeTransform {
  constructor(
    private readonly fallback: number,
    private readonly max = MAX_PAGE_LIMIT,
  ) {}
  transform(value: unknown): number {
    return parseLimit(value, this.fallback, this.max);
  }
}
