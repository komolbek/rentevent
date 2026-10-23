'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight } from 'lucide-react';
import { contentApi, type Inspiration } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { localizedField } from '@/lib/i18n/product';
import { cn } from '@/lib/utils';
import { SectionHeader } from './SectionHeader';
import { Reveal } from './Reveal';

export function useInspirations() {
  return useQuery({
    queryKey: ['inspirations'],
    queryFn: () => contentApi.getInspirations(),
    staleTime: 5 * 60 * 1000,
  });
}

/** One photo story: the image is the card, the title sits on it. */
export function InspirationCard({ item, size = 'md' }: { item: Inspiration; size?: 'md' | 'lg' }) {
  const { t, locale } = useTranslation();
  const title = localizedField(item, 'title', locale);
  const description = localizedField(item, 'description', locale);
  const href = item.link_url?.trim() || '/catalog';
  const external = /^https?:\/\//.test(href);

  return (
    <Link
      href={href}
      {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
      className={cn(
        'group relative flex h-full flex-col justify-end overflow-hidden rounded-3xl bg-brand-graphite text-white outline-none',
        'focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        size === 'lg' ? 'min-h-[24rem] sm:min-h-[30rem]' : 'min-h-[20rem] sm:min-h-[24rem]',
      )}
    >
      <Image
        src={item.image_url}
        alt=""
        fill
        sizes={size === 'lg' ? '(max-width: 768px) 100vw, 60vw' : '(max-width: 768px) 100vw, 40vw'}
        className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
      />
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{ background: 'linear-gradient(180deg, rgba(23,23,23,0) 35%, rgba(23,23,23,0.88) 100%)' }}
      />
      <div className="relative p-5 sm:p-7">
        <h3 className="font-display text-xl font-semibold leading-snug sm:text-2xl">{title}</h3>
        {description && <p className="mt-2 line-clamp-2 max-w-lg text-sm text-white/80">{description}</p>}
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-[0.08em] text-white">
          {t('inspirations.more')}
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/**
 * "Inspirations", after fair.rent: stands and events furnished by RentEvent,
 * managed in admin → Вдохновение. Hidden until there is at least one — a
 * section of stock photos would be an advert for someone else's stand.
 */
export function Inspirations() {
  const { t } = useTranslation();
  const { data } = useInspirations();
  const items = data?.items ?? [];
  if (items.length === 0) return null;

  const [first, ...rest] = items;
  return (
    <section className="container mx-auto px-4 pt-14 sm:pt-20">
      <SectionHeader
        eyebrow={t('inspirations.eyebrow')}
        title={t('inspirations.title')}
        description={t('inspirations.subtitle')}
        linkLabel={t('inspirations.all')}
        href="/inspirations"
      />
      <div className="grid gap-4 md:grid-cols-5">
        <Reveal className="md:col-span-3">
          <InspirationCard item={first} size="lg" />
        </Reveal>
        {rest.length > 0 && (
          <div className="grid gap-4 md:col-span-2">
            {rest.slice(0, 2).map((item, i) => (
              <Reveal key={item.id} delay={(i + 1) * 0.06}>
                <InspirationCard item={item} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
