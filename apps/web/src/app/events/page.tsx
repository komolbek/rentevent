'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPin, ArrowUpRight } from 'lucide-react';
import { eventsApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { localizeEvent, formatEventRange, eventRentalPeriod } from '@/lib/events';
import { Reveal } from '@/components/home/Reveal';
import { RentForEventButton } from '@/components/events/RentForEventButton';

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
            const title = localizeEvent(e, locale, 'title');
            const description = localizeEvent(e, locale, 'description');
            const isOver = eventRentalPeriod(e) === null;
            return (
              <Reveal key={e.id} delay={Math.min(i * 0.04, 0.4)} className="h-full">
                {/* The card's one action is "rent for this fair" (spec §3.9);
                    the fair's own website is a small secondary link. */}
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg">
                  <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                    {e.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={e.image_url}
                        alt={title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-muted">
                        <CalendarDays className="h-10 w-10 text-primary/40" />
                      </div>
                    )}
                    <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                      {formatEventRange(e.start_date, e.end_date, locale)}
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
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
                      {isOver ? (
                        <span className="text-sm text-muted-foreground">{t('events.over')}</span>
                      ) : (
                        <RentForEventButton event={e} size="sm" />
                      )}
                      {e.website_url && (
                        <a
                          href={e.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-10 items-center gap-1 rounded text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50"
                        >
                          {t('events.website')} <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
