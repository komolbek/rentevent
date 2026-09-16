'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Layers } from 'lucide-react';
import { setsApi, type SetPublic } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { countLabel, type Locale } from '@/lib/i18n';
import { SectionHeader } from './SectionHeader';
import { Reveal } from './Reveal';

function localize(s: SetPublic, locale: Locale, field: 'name' | 'description'): string {
  const base = (s[field] as string | null) || '';
  if (locale === 'uz') return (s[`${field}_uz`] || '').trim() || base;
  if (locale === 'en') return (s[`${field}_en`] || '').trim() || base;
  return base;
}

/**
 * Ready-made bundles on the home page. A set is the fastest path to a rented
 * stand for someone who does not want to pick chairs one by one — it deserves
 * a slot above the fold line of the second screen, not a nav item only.
 */
export function SetsRail() {
  const { t, locale } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['sets', 'home'],
    queryFn: () => setsApi.getAll(),
  });

  const sets = (data?.items ?? []).slice(0, 3);
  if (!isLoading && sets.length === 0) return null;

  return (
    <section className="container mx-auto px-4 pt-14 sm:pt-20">
      <SectionHeader
        eyebrow={t('home.sets_eyebrow')}
        title={t('home.sets_title')}
        linkLabel={t('home.sets_link')}
        href="/sets"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? [...Array(3)].map((_, i) => (
              <div key={i} className="aspect-[4/3] animate-pulse rounded-2xl bg-muted" />
            ))
          : sets.map((set, index) => {
              const name = localize(set, locale, 'name');
              const items = set.items
                .map((i) => i.product)
                .filter(Boolean)
                .slice(0, 3)
                .map((p) => p!.name);
              return (
                <Reveal key={set.id} delay={index * 0.06}>
                  <Link
                    href="/sets"
                    className="group relative block h-full overflow-hidden rounded-2xl border border-border bg-brand-graphite text-white transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:elev-2"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {set.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={set.photos[0]}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-brand-dark-gray">
                          <Layers className="h-10 w-10 text-white/50" />
                        </div>
                      )}
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(23,23,23,0) 35%, rgba(23,23,23,0.55) 70%, rgba(23,23,23,0.92) 100%)',
                        }}
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-white">
                        {countLabel(set.items_count, locale, 'items')}
                      </span>
                      <div className="absolute inset-x-0 bottom-0 p-5">
                        <h3 className="font-display text-xl font-semibold leading-tight">{name}</h3>
                        {items.length > 0 && (
                          <p className="mt-1.5 line-clamp-1 text-sm text-white/70">{items.join(' · ')}</p>
                        )}
                        <div className="mt-3 flex items-end justify-between">
                          <p className="text-lg font-bold">
                            {formatPrice(set.daily_price)}{' '}
                            <span className="text-sm font-medium text-white/70">
                              {t('common.currency')}/{t('product_card.per_day')}
                            </span>
                          </p>
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm transition-colors group-hover:bg-primary">
                            <ArrowUpRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
      </div>
    </section>
  );
}
