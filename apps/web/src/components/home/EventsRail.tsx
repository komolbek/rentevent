'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react';
import { eventsApi, type EventItem } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Locale } from '@/lib/i18n';
import { SectionHeader } from './SectionHeader';
import { Reveal } from './Reveal';

function localize(e: EventItem, locale: Locale, field: 'title' | 'description'): string {
  const base = e[field] || '';
  if (locale === 'uz') return (e[`${field}_uz`] || '').trim() || base;
  if (locale === 'en') return (e[`${field}_en`] || '').trim() || base;
  return base;
}

function fmtRange(start: string, end: string | null, locale: Locale) {
  const loc = locale === 'uz' ? 'uz-UZ' : locale === 'en' ? 'en-US' : 'ru-RU';
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
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

/** Latest day an event is still running — some rows have end < start, so take the max. */
function lastDay(e: EventItem): number {
  const s = new Date(e.start_date).getTime();
  const en = e.end_date ? new Date(e.end_date).getTime() : s;
  return Math.max(s, en);
}

/**
 * The next three exhibitions. RentEvent's customers rent for a specific fair,
 * so naming the fair on the home page answers "do they know my event?" before
 * the visitor has to ask.
 */
export function EventsRail() {
  const { t, locale } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['events', 'home'],
    queryFn: () => eventsApi.getAll(),
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = (data?.items ?? [])
    .filter((e) => e.is_active !== false && lastDay(e) >= today.getTime())
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(0, 3);

  if (!isLoading && upcoming.length === 0) return null;

  return (
    <section className="container mx-auto px-4 pt-14 sm:pt-20">
      <SectionHeader
        eyebrow={t('home.events_eyebrow')}
        title={t('home.events_title')}
        description={t('home.events_hint')}
        linkLabel={t('home.events_link')}
        href="/events"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? [...Array(3)].map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted" />
            ))
          : upcoming.map((e, index) => {
              const title = localize(e, locale, 'title');
              const place = [e.venue, e.city].filter(Boolean).join(', ');
              return (
                <Reveal key={e.id} delay={index * 0.06}>
                  <Link
                    href="/events"
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/40 hover:elev-2"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                      {e.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={e.image_url}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <CalendarDays className="h-10 w-10 text-primary/50" />
                        </div>
                      )}
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {fmtRange(e.start_date, e.end_date, locale)}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-4 sm:p-5">
                      <h3 className="font-display line-clamp-2 text-base font-semibold leading-snug sm:text-lg">
                        {title}
                      </h3>
                      {place && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="line-clamp-1">{place}</span>
                        </p>
                      )}
                      <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary-text">
                        {t('home.events_cta')}
                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
      </div>
    </section>
  );
}
