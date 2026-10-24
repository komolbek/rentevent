'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react';
import { eventsApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { localizeEvent, formatEventRange, eventLastDay } from '@/lib/events';
import { RentForEventButton } from '@/components/events/RentForEventButton';
import { SectionHeader } from './SectionHeader';
import { Reveal } from './Reveal';

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
    .filter((e) => e.is_active !== false && eventLastDay(e) >= today.getTime())
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
              const title = localizeEvent(e, locale, 'title');
              const place = [e.venue, e.city].filter(Boolean).join(', ');
              return (
                <Reveal key={e.id} delay={index * 0.06}>
                  {/* Same action as the events page: rent for this fair. */}
                  <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/40 hover:elev-2">
                    {/* Event images are the fair's logo (wide, often transparent):
                        shown whole on white, never cropped to a photo frame. */}
                    <div className="relative aspect-[16/9] overflow-hidden border-b border-border bg-white">
                      {e.image_url ? (
                        <Image
                          src={e.image_url}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-contain p-8 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] sm:p-10"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <CalendarDays className="h-10 w-10 text-primary/50" />
                        </div>
                      )}
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-white">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatEventRange(e.start_date, e.end_date, locale, 'short')}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-4 sm:p-5">
                      <h3 className="font-display line-clamp-2 text-base font-semibold leading-snug sm:text-lg">
                        <Link href={`/events/${e.id}`} className="hover:text-primary-text hover:underline">
                          {title}
                        </Link>
                      </h3>
                      {place && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="line-clamp-1">{place}</span>
                        </p>
                      )}
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                        <RentForEventButton event={e} size="sm" />
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
    </section>
  );
}
