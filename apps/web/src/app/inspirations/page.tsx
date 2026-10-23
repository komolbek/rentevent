'use client';

import { Sparkles } from 'lucide-react';
import { EmptyState, Button } from '@/components/ui';
import { InspirationCard, useInspirations } from '@/components/home/Inspirations';
import { Reveal } from '@/components/home/Reveal';
import { useTranslation } from '@/lib/i18n/useTranslation';
import Link from 'next/link';

export default function InspirationsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useInspirations();
  const items = data?.items ?? [];

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <div className="mb-8 max-w-2xl sm:mb-10">
        <p className="eyebrow mb-2.5 text-primary-text">{t('inspirations.eyebrow')}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{t('inspirations.title')}</h1>
        <p className="mt-3 text-muted-foreground sm:text-lg">{t('inspirations.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="min-h-[20rem] animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-12 w-12" />}
          title={t('inspirations.empty_title')}
          description={t('inspirations.empty_desc')}
          action={
            <Button asChild>
              <Link href="/catalog">{t('home.view_catalog')}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item, i) => (
            <Reveal key={item.id} delay={(i % 2) * 0.06} className={i % 3 === 0 ? 'md:col-span-2' : undefined}>
              <InspirationCard item={item} size={i % 3 === 0 ? 'lg' : 'md'} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
