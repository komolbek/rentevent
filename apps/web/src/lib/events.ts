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
    const e = end ? new Date(end) : null;
    // Some rows have end < start (data entry slips); show the start day
    // rather than a backwards range like "10 нояб. – 12 сент.".
    if (!e || e.getTime() <= s.getTime()) return s.toLocaleDateString(loc, opts);
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      return `${s.getDate()}–${e.toLocaleDateString(loc, opts)}`;
    }
    return `${s.toLocaleDateString(loc, opts)} – ${e.toLocaleDateString(loc, opts)}`;
  } catch {
    return start;
  }
}

/**
 * The rental period to pre-fill for "rent for this fair": delivery to
 * collection (the API's rental_from / rental_to — the day before opening to
 * the last day unless admin set them), clamped so it never starts before
 * tomorrow (the catalog's earliest date). `null` when the fair is over.
 */
export function eventRentalPeriod(e: EventItem): { from: Date; to: Date } | null {
  const tomorrow = getTomorrow();
  const start = localDay(e.rental_from ?? e.start_date);
  const end = localDay(e.rental_to ?? new Date(eventLastDay(e)).toISOString());
  if (Number.isNaN(start.getTime()) || end < tomorrow) return null;
  return { from: start < tomorrow ? tomorrow : start, to: end };
}

/** Upcoming (not yet finished) active events, soonest first. */
export function upcomingEvents(events: EventItem[]): EventItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events
    .filter((e) => e.is_active !== false && eventLastDay(e) >= today.getTime())
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
}

/** A date-only API value (UTC midnight) as that calendar day at local midnight. */
export function localDay(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Short "26 окт." style date in the UI language. */
export function formatDay(iso: string, locale: Locale): string {
  const loc = locale === 'uz' ? 'uz-UZ' : locale === 'en' ? 'en-US' : 'ru-RU';
  return localDay(iso).toLocaleDateString(loc, { day: 'numeric', month: 'short' });
}
