'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CalendarDays, MapPin, ArrowUpRight } from 'lucide-react';
import { eventsApi, type EventItem } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Locale } from '@/lib/i18n';

function localize(e: EventItem, locale: Locale, field: 'title' | 'description'): string {
  const base = e[field] || '';
  if (locale === 'uz') return (e[`${field}_uz`] || '').trim() || base;
  if (locale === 'en') return (e[`${field}_en`] || '').trim() || base;
  return base;
}

function fmtRange(start: string, end: string | null, locale: Locale) {
  const loc = locale === 'uz' ? 'uz-UZ' : locale === 'en' ? 'en-US' : 'ru-RU';
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  try {
    const s = new Date(start);
    if (!end) return s.toLocaleDateString(loc, opts);
    const e = new Date(end);
    const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
    if (sameMonth) {
      return `${s.getDate()}–${e.toLocaleDateString(loc, opts)}`;
    }
    return `${s.toLocaleDateString(loc, opts)} – ${e.toLocaleDateString(loc, opts)}`;
  } catch {
    return start;
  }
}

export default function EventsPage() {
  const { t, locale } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll(),
  });

  const events = data?.items ?? [];

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-text mb-2">
          {t('events.eyebrow')}
        </p>
        <h1 className="text-3xl lg:text-4xl font-bold mb-3">{t('events.title')}</h1>
        <p className="text-muted-foreground">{t('events.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-border py-16 text-center text-muted-foreground">
          {t('events.empty')}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e, i) => {
            const title = localize(e, locale, 'title');
            const description = localize(e, locale, 'description');
            const Card = (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.4) }}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                  {e.image_url ? (
                    <img src={e.image_url} alt={title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-muted">
                      <CalendarDays className="h-10 w-10 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    {fmtRange(e.start_date, e.end_date, locale)}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-semibold leading-snug line-clamp-2">{title}</h3>
                  {(e.venue || e.city) && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {[e.venue, e.city].filter(Boolean).join(', ')}
                    </div>
                  )}
                  {description && (
                    <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{description}</p>
                  )}
                  {e.website_url && (
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-text">
                      {t('events.learn_more')} <ArrowUpRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </motion.div>
            );
            return e.website_url ? (
              <a key={e.id} href={e.website_url} target="_blank" rel="noopener noreferrer" className="block h-full">
                {Card}
              </a>
            ) : (
              <div key={e.id} className="h-full">{Card}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
