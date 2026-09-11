'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Layers, ShoppingCart, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { IProduct } from '@rentevent/types';
import { setsApi, type SetPublic } from '@/lib/api';
import { useCartStore } from '@/stores/cart-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { formatPrice, getTomorrow, addDays } from '@/lib/utils';
import type { Locale } from '@/lib/i18n';

function localize(s: SetPublic, locale: Locale, field: 'name' | 'description'): string {
  const base = (s[field] as string | null) || '';
  if (locale === 'uz') return (s[`${field}_uz`] || '').trim() || base;
  if (locale === 'en') return (s[`${field}_en`] || '').trim() || base;
  return base;
}

function itemName(p: NonNullable<SetPublic['items'][number]['product']>, locale: Locale): string {
  if (locale === 'uz') return (p.name_uz || '').trim() || p.name;
  if (locale === 'en') return (p.name_en || '').trim() || p.name;
  return p.name;
}

export default function SetsPage() {
  const { t, locale } = useTranslation();
  const { addItem } = useCartStore();
  const { data, isLoading } = useQuery({
    queryKey: ['sets'],
    queryFn: () => setsApi.getAll(),
  });

  const sets = data?.items ?? [];

  const addSetToCart = (s: SetPublic) => {
    const from = getTomorrow();
    const to = addDays(getTomorrow(), 0);
    let added = 0;
    for (const it of s.items) {
      if (!it.product) continue;
      const product = {
        id: it.product.id,
        name: it.product.name,
        nameUz: it.product.name_uz,
        nameEn: it.product.name_en,
        photos: it.product.photos ?? [],
        dailyPrice: it.product.daily_price,
        totalStock: it.product.total_stock,
        pricingTiers: [],
        quantityPricing: [],
      } as unknown as IProduct;
      addItem(product, it.quantity, from, to);
      added += 1;
    }
    if (added > 0) toast.success(t('sets.added_to_cart'));
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-text mb-2">{t('sets.eyebrow')}</p>
        <h1 className="text-3xl lg:text-4xl font-bold mb-3">{t('sets.title')}</h1>
        <p className="text-muted-foreground">{t('sets.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : sets.length === 0 ? (
        <div className="rounded-2xl border border-border py-16 text-center text-muted-foreground">
          {t('sets.empty')}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((s, i) => {
            const name = localize(s, locale, 'name');
            const description = localize(s, locale, 'description');
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.4) }}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  {s.photos?.[0] ? (
                    <img src={s.photos[0]} alt={name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-muted">
                      <Layers className="h-10 w-10 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    <Package className="h-3.5 w-3.5" /> {t('sets.items_count', { count: s.items_count })}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-semibold leading-snug">{name}</h3>
                  {description && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{description}</p>}

                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {s.items.slice(0, 5).map((it) => (
                      <li key={it.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">{it.product ? itemName(it.product, locale) : '—'}</span>
                        <span className="shrink-0 text-xs">×{it.quantity}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto flex items-center justify-between pt-4">
                    <div>
                      <span className="text-lg font-bold text-primary">{formatPrice(s.daily_price)} UZS</span>
                      <span className="ml-1 text-xs text-muted-foreground">/ {t('product_card.per_day')}</span>
                    </div>
                    <button
                      onClick={() => addSetToCart(s)}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <ShoppingCart className="h-4 w-4" /> {t('sets.add')}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
