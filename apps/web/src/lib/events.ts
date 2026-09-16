import type { EventItem } from '@/lib/api';
import type { Locale } from '@/lib/i18n';
import { getTomorrow } from '@/lib/utils';

export function localizeEvent(e: EventItem, locale: Locale, field: 'title' | 'description'): string {
  const base = e[field] || '';
  if (locale === 'uz') return (e[`${field}_uz`] || '').trim() || base;
  if (locale === 'en') return (e[`${field}_en`] || '').trim() || base;
  return base;
}

/** Latest day an event is still running — some rows have end < start, so take the max. */
export function eventLastDay(e: EventItem): number {
  const s = new Date(e.start_date).getTime();
  const en = e.end_date ? new Date(e.end_date).getTime() : s;
  return Math.max(s, en);
}

export function formatEventRange(
  start: string,
  end: string | null,
  locale: Locale,
  style: 'short' | 'long' = 'long',
): string {
  const loc = locale === 'uz' ? 'uz-UZ' : locale === 'en' ? 'en-US' : 'ru-RU';
  const opts: Intl.DateTimeFormatOptions =
    style === 'short' ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'long', year: 'numeric' };
  try {
    const s = new Date(start);
    if (!end) return s.toLocaleDateString(loc, opts);
    const e = new Date(end);
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return `${s.getDate()}–${e.toLocaleDateString(loc, opts)}`;
    }
    return `${s.toLocaleDateString(loc, opts)} – ${e.toLocaleDateString(loc, opts)}`;
  } catch {
    return start;
  }
}

/**
 * The rental period to pre-fill for "rent for this fair": the event's days,
 * clamped so it never starts before tomorrow (the catalog's earliest date).
 * `null` when the event is already over.
 */
export function eventRentalPeriod(e: EventItem): { from: Date; to: Date } | null {
  const tomorrow = getTomorrow();
  const start = new Date(e.start_date);
  const end = new Date(eventLastDay(e));
  if (Number.isNaN(start.getTime()) || end < tomorrow) return null;
  return { from: start < tomorrow ? tomorrow : start, to: end };
}
