'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Truck, Shield, Clock, Phone, PackageCheck, Send } from 'lucide-react';
import { Button } from '@/components/ui';
import { HomeHero } from '@/components/home/HomeHero';
import { CategoryTile } from '@/components/home/CategoryTile';
import { ProductRail } from '@/components/home/ProductRail';
import { SetsRail } from '@/components/home/SetsRail';
import { EventsRail } from '@/components/home/EventsRail';
import { HowItWorks } from '@/components/home/HowItWorks';
import { SectionHeader } from '@/components/home/SectionHeader';
import { Reveal } from '@/components/home/Reveal';
import { settingsApi, categoriesApi, productsApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { ICategory } from '@rentevent/types';
import { countLabel } from '@/lib/i18n';

export default function HomePage() {
  const { t, locale } = useTranslation();

  const { data: settings } = useQuery({
    queryKey: ['businessSettings'],
    queryFn: () => settingsApi.getBusinessInfo(),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories', 'home'],
    queryFn: categoriesApi.getAll,
  });

  const { data: popular, isLoading: popularLoading } = useQuery({
    queryKey: ['products', 'home-popular'],
    queryFn: () => productsApi.getAll({ sort: 'popular', limit: 8 }),
  });

  // The whole catalogue is small (≈40 items), so one request gives every
  // category a real photo — the categories table has no artwork of its own.
  const { data: allProducts } = useQuery({
    queryKey: ['products', 'home-all'],
    queryFn: () => productsApi.getAll({ limit: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  const phoneNumber = settings?.phone || '+998901234567';
  const telegramUrl = settings?.telegramUrl || 'https://t.me/rentevent_uz';
  const productTotal = popular?.meta.total;

  // Category names are localized the same way the catalog does it.
  const localizeName = (name: string) => {
    const translated = t(`category_name.${name.trim()}` as never);
    return translated.startsWith('category_name.') ? name.trim() : translated;
  };

  const categoryPhotos = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of allProducts?.items ?? []) {
      // The list endpoint nests `category: {id}` instead of a flat categoryId.
      const categoryId = p.category?.id ?? p.categoryId;
      if (categoryId && p.photos?.[0] && !map.has(categoryId)) map.set(categoryId, p.photos[0]);
    }
    return map;
  }, [allProducts]);

  // `productCount` is what the public endpoint actually sends; `_count` is
  // the shape the shared type promises. Accept both, hide empty categories.
  const productCount = (c: ICategory) =>
    (c as ICategory & { productCount?: number }).productCount ?? c._count?.products;

  const rootCategories = (categories ?? [])
    .filter((c) => !c.parentCategoryId && c.isActive !== false)
    .filter((c) => (productCount(c) ?? 1) > 0);

  const features = [
    {
      icon: PackageCheck,
      title: t('home.feature_wide_selection'),
      description:
        productTotal !== undefined
          ? t('home.feature_wide_selection_desc', { count: productTotal })
          : t('home.feature_wide_selection_desc_fallback'),
    },
    { icon: Truck, title: t('home.feature_fast_delivery'), description: t('home.feature_fast_delivery_desc') },
    { icon: Clock, title: t('home.feature_flexible'), description: t('home.feature_flexible_desc') },
    { icon: Shield, title: t('home.feature_quality'), description: t('home.feature_quality_desc') },
  ];

  return (
    <div className="pb-8">
      <HomeHero
        products={popular?.items ?? []}
        productTotal={productTotal}
        phoneNumber={phoneNumber}
      />

      {/* ================= CATEGORIES ================= */}
      {rootCategories.length > 0 && (
        <section className="container mx-auto px-4 pt-14 sm:pt-20">
          <SectionHeader
            eyebrow={t('nav.catalog')}
            title={t('footer.all_categories')}
            linkLabel={t('home.view_catalog')}
            href="/catalog"
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {rootCategories.map((category, index) => (
              <Reveal key={category.id} delay={Math.min(index, 7) * 0.04}>
                <CategoryTile
                  id={category.id}
                  name={localizeName(category.name)}
                  countLabel={
                    productCount(category) !== undefined
                      ? countLabel(productCount(category)!, locale, 'products')
                      : null
                  }
                  photo={categoryPhotos.get(category.id)}
                  icon={category.iconName}
                />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ================= POPULAR PRODUCTS ================= */}
      <ProductRail
        eyebrow={t('home.popular_eyebrow')}
        title={t('home.popular_title')}
        linkLabel={t('home.view_catalog')}
        href="/catalog?sort=popular"
        products={popular?.items}
        isLoading={popularLoading}
      />

      {/* ================= SETS ================= */}
      <SetsRail />

      {/* ================= HOW IT WORKS ================= */}
      <HowItWorks />

      {/* ================= EVENTS ================= */}
      <EventsRail />

      {/* ================= TERMS (concrete, not adjectives) ================= */}
      <section className="container mx-auto px-4 pt-14 sm:pt-20">
        <SectionHeader eyebrow={t('home.why_eyebrow')} title={t('home.why_title')} />
        <div className="grid grid-cols-1 overflow-hidden rounded-3xl border border-border bg-card sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 0.06} className="-mb-px -mr-px border-b border-r border-border">
              <div className="group h-full p-6 transition-colors hover:bg-primary-50 dark:hover:bg-primary/10 sm:p-7">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-[0_8px_20px_-8px_rgba(242,86,41,0.7)]">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================= CLOSING BAND ================= */}
      <section className="container mx-auto px-4 pt-14 sm:pt-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-brand-graphite px-6 py-9 text-white sm:px-10 sm:py-12">
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-[22rem] w-[22rem] rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(242,86,41,0.45), transparent 65%)' }}
              aria-hidden="true"
            />
            <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  {t('home.closing_title')}
                </h2>
                <p className="mt-2 max-w-lg text-sm text-white/70 sm:text-base">
                  {t('home.closing_description')}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-3">
                <a href={`tel:${phoneNumber}`}>
                  <Button size="lg" variant="primary" leftIcon={<Phone className="h-5 w-5" />}>
                    {t('home.call')}
                  </Button>
                </a>
                <a href={telegramUrl} target="_blank" rel="noopener noreferrer">
                  <Button
                    size="lg"
                    className="border border-white/25 bg-white/10 text-white hover:bg-white/20"
                    leftIcon={<Send className="h-5 w-5" />}
                  >
                    {t('home.closing_telegram')}
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
