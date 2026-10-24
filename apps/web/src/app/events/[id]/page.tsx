'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, MapPin, PackageCheck, Truck, Undo2 } from 'lucide-react';
import { eventsApi, productsApi } from '@/lib/api';
import { eventRentalPeriod, formatDay, formatEventRange, localizeEvent } from '@/lib/events';
import { useSelectEvent } from '@/components/events/useSelectEvent';
import { ProductCard } from '@/components/catalog/ProductCard';
import { Reveal } from '@/components/home/Reveal';
import { SectionHeader } from '@/components/home/SectionHeader';
import { EmptyState, Button } from '@/components/ui';
import { useTranslation } from '@/lib/i18n/useTranslation';

/**
 * One fair (fair.rent's /fair/<name>): its dates, when furniture arrives and
 * leaves, how prices read, the products recommended for it, and one action —
 * choose this fair, which fills the rental period and switches prices.
 */
export default function FairPage() {
  const { id } = useParams<{ id: string }>();
  const { t, locale } = useTranslation();
  const router = useRouter();
  const selectEvent = useSelectEvent();

  const { data: event, isLoading, isError } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.getById(id),
    enabled: !!id,
  });

  const { data: picks } = useQuery({
    queryKey: ['products', 'event-picks', id],
    queryFn: () => productsApi.getAll({ event_id: id, event_featured: true, limit: 8, sort: 'recommended' }),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="h-72 animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="container mx-auto px-4 py-16">
        <EmptyState
          icon={<CalendarDays className="h-12 w-12" />}
          title={t('fair.not_found')}
          action={
            <Button asChild>
              <Link href="/events">{t('fair.all_fairs')}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const title = localizeEvent(event, locale, 'title');
  const description = localizeEvent(event, locale, 'description');
  const place = [event.venue, event.city].filter(Boolean).join(', ');
  const period = eventRentalPeriod(event);
  const flat = event.price_mode === 'FLAT';

  const choose = () => {
    if (selectEvent(event)) router.push('/catalog');
  };

  const facts = [
    {
      icon: Truck,
      label: t('fair.delivery'),
      value: event.rental_from ? formatDay(event.rental_from, locale) : '—',
    },
    {
      icon: Undo2,
      label: t('fair.collection'),
      value: event.rental_to ? formatDay(event.rental_to, locale) : '—',
    },
    {
      icon: PackageCheck,
      label: t('fair.prices'),
      value: flat ? t('fair.prices_flat') : t('fair.prices_daily'),
    },
  ];

  return (
    <div className="pb-8">
      <div className="container mx-auto px-4 pt-6">
        <Link
          href="/events"
          className="mb-4 inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('fair.all_fairs')}
        </Link>

        <section
          className="relative overflow-hidden rounded-3xl bg-brand-graphite text-white"
          aria-labelledby="fair-title"
        >
          <div
            className="pointer-events-none absolute -right-24 -top-28 h-[26rem] w-[26rem] rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(242,86,41,0.5), transparent 65%)' }}
            aria-hidden="true"
          />
          <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="eyebrow mb-3 text-primary-300">{t('fair.eyebrow')}</p>
              <h1 id="fair-title" className="font-display text-2xl font-semibold leading-tight tracking-tight sm:text-4xl">
                {title}
              </h1>
              <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-white/80">
                <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                  <CalendarDays className="h-4 w-4" />
                  {formatEventRange(event.start_date, event.end_date, locale)}
                </span>
                {place && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {place}
                  </span>
                )}
              </p>

              <dl className="mt-7 grid gap-3 sm:grid-cols-3">
                {facts.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                    <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/60">
                      <Icon className="h-4 w-4" />
                      {label}
                    </dt>
                    <dd className="mt-1.5 text-lg font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                {period ? (
                  <button
                    type="button"
                    onClick={choose}
                    className="inline-flex h-12 items-center gap-2 rounded-full bg-rent px-6 text-sm font-bold uppercase tracking-[0.08em] text-white shadow-[0_10px_30px_-10px_rgba(217,44,30,0.9)] transition-colors hover:bg-rent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  >
                    {t('fair.choose')}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/80">{t('fair.over')}</span>
                )}
                {event.website_url && (
                  <a
                    href={event.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center gap-1 text-sm text-white/75 hover:text-white"
                  >
                    {t('events.website')} <ArrowUpRight className="h-4 w-4" />
                  </a>
                )}
              </div>
              <p className="mt-4 max-w-2xl text-sm text-white/60">
                {flat ? t('fair.note_flat') : t('fair.note_daily')}
              </p>
            </div>

            {event.image_url && (
              <div className="relative mx-auto h-40 w-64 overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] sm:h-48 sm:w-80">
                <Image src={event.image_url} alt="" fill sizes="320px" className="object-contain p-6" />
              </div>
            )}
          </div>
        </section>

        {description && (
          <p className="mt-8 max-w-3xl whitespace-pre-line text-muted-foreground sm:text-lg">{description}</p>
        )}
      </div>

      {(picks?.items.length ?? 0) > 0 && (
        <section className="container mx-auto px-4 pt-12 sm:pt-16">
          <SectionHeader eyebrow={t('fair.picks_eyebrow')} title={t('fair.picks_title')} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {picks!.items.map((product, index) => (
              <Reveal key={product.id} delay={(index % 4) * 0.05}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {period && (
        <section className="container mx-auto px-4 pt-12">
          <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-primary-50 p-6 dark:bg-primary/10 sm:flex-row sm:items-center sm:p-8">
            <p className="font-display text-xl font-semibold">{t('fair.cta_title')}</p>
            <button
              type="button"
              onClick={choose}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_6px_20px_-6px_rgba(242,86,41,0.55)] hover:bg-primary/90"
            >
              {t('fair.see_catalog')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
