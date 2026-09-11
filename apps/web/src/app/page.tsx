'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Truck, Shield, Clock, Phone, ArrowUpRight, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui';
import { CategoryCard } from '@/components/catalog/CategoryCard';
import { HeroSearch } from '@/components/home/HeroSearch';
import { ProductRail } from '@/components/home/ProductRail';
import { settingsApi, categoriesApi, productsApi } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export default function HomePage() {
  const { t } = useTranslation();

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

  const phoneNumber = settings?.phone || '+998901234567';
  const productTotal = popular?.meta.total;

  // Category names are localized the same way the catalog does it.
  const localizeName = (name: string) => {
    const translated = t(`category_name.${name}` as never);
    return translated.startsWith('category_name.') ? name : translated;
  };

  const rootCategories = (categories ?? []).filter((c) => !c.parentCategoryId);

  const topCategories = rootCategories.slice(0, 8).map((c) => ({
    id: c.id,
    name: localizeName(c.name),
    image: c.imageUrl,
    icon: c.iconName,
    parentCategoryId: c.parentCategoryId,
    displayOrder: c.displayOrder,
    isActive: c.isActive,
    _count: c._count,
    createdAt: c.createdAt,
  }));

  const searchCategories = rootCategories.map((c) => ({
    id: c.id,
    name: localizeName(c.name),
  }));

  // Three real product shots for the hero collage. The catalogue photos are
  // white-background cutouts, which is exactly why the hero is light now —
  // they sit on the warm paper background instead of fighting a black panel.
  const collage = (popular?.items ?? []).filter((p) => p.photos?.[0]).slice(0, 3);

  const features = [
    {
      icon: PackageCheck,
      title: t('home.feature_wide_selection'),
      description:
        productTotal !== undefined
          ? t('home.feature_wide_selection_desc', { count: productTotal })
          : t('home.feature_wide_selection_desc_fallback'),
    },
    {
      icon: Truck,
      title: t('home.feature_fast_delivery'),
      description: t('home.feature_fast_delivery_desc'),
    },
    {
      icon: Clock,
      title: t('home.feature_flexible'),
      description: t('home.feature_flexible_desc'),
    },
    {
      icon: Shield,
      title: t('home.feature_quality'),
      description: t('home.feature_quality_desc'),
    },
  ];

  return (
    <div className="pb-8">
      {/* ================= HERO ================= */}
      <section className="container mx-auto px-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-3xl border border-border bg-muted px-5 py-6 sm:px-10 sm:py-8 md:px-12 md:py-10"
        >
          {/* Decoration lives in its own clipped layer so the hero itself can
              stay unclipped — the search bar's calendar popover overflows the
              hero box, and `overflow-hidden` here would cut it in half. */}
          <div
            className="u-grain pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
            aria-hidden="true"
          >
            {/* One warm wash, low and wide — texture, not a spotlight. */}
            <div
              className="absolute -right-24 -top-32 h-[26rem] w-[26rem] rounded-full opacity-70 blur-3xl"
              style={{ background: 'radial-gradient(circle, rgba(242,86,41,0.18), transparent 65%)' }}
            />
            <div className="bg-dotgrid absolute inset-0 text-foreground/[0.06]" />
          </div>

          <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="eyebrow mb-5 inline-flex items-center gap-2 text-primary-text">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {t('home.hero_badge')}
              </p>

              <h1 className="font-display max-w-2xl text-2xl font-semibold leading-[1.1] sm:text-4xl sm:leading-[1.06] lg:text-5xl">
                {t('home.hero_title')}
              </h1>

            </div>

            {/* Product collage — desktop only, and only once real photos load. */}
            {collage.length === 3 && (
              <div className="relative hidden h-[17rem] lg:block" aria-hidden="true">
                {/* The cards overlap, so each price sits in the corner the next
                    card does not cover. */}
                {[
                  { card: 'left-0 top-0 h-[9.5rem] w-[11rem] -rotate-3', price: 'left-2 top-2' },
                  { card: 'right-4 top-1 h-[11rem] w-[12.5rem] rotate-2', price: 'right-2 bottom-2' },
                  { card: 'bottom-1 left-32 h-[10rem] w-[13rem] rotate-1', price: 'left-2 bottom-2' },
                ].map((position, index) => (
                  <motion.figure
                    key={collage[index].id}
                    initial={{ opacity: 0, y: 18, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.15 + index * 0.1, ease: [0.16, 1, 0.3, 1], duration: 0.6 }}
                    className={`elev-2 absolute overflow-hidden rounded-2xl border border-border bg-white ${position.card}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={collage[index].photos[0]}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="eager"
                    />
                    <figcaption className={`absolute rounded-full bg-brand-graphite/85 px-2.5 py-1 text-[0.6875rem] font-medium text-white backdrop-blur-sm ${position.price}`}>
                      {t('home.collage_price', {
                        price: formatPrice(collage[index].dailyPrice),
                      })}
                    </figcaption>
                  </motion.figure>
                ))}
              </div>
            )}
          </div>

          <div className="relative z-20 mt-6 sm:mt-8">
            <HeroSearch categories={searchCategories} />
          </div>
        </motion.div>
      </section>

      {/* ================= CATEGORIES ================= */}
      {topCategories.length > 0 && (
        <section className="container mx-auto px-4 pt-12 sm:pt-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-3 text-primary-text">{t('nav.catalog')}</p>
              <h2 className="font-display text-3xl font-semibold sm:text-4xl">
                {t('footer.all_categories')}
              </h2>
            </div>
            <Link
              href="/catalog"
              className="link-underline hidden shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              {t('home.view_catalog')}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
          >
            {topCategories.map((category) => (
              <motion.div key={category.id} variants={itemVariants}>
                <CategoryCard category={category} />
              </motion.div>
            ))}
          </motion.div>
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

      {/* ================= WHY (concrete terms, not adjectives) ================= */}
      <section className="container mx-auto px-4 pt-12 sm:pt-16">
        <p className="eyebrow mb-3 text-primary-text">{t('home.why_eyebrow')}</p>
        <h2 className="font-display mb-10 max-w-2xl text-3xl font-semibold sm:text-4xl">
          {t('home.why_title')}
        </h2>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 overflow-hidden rounded-3xl border border-border sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group relative -mb-px -mr-px border-b border-r border-border p-7 transition-colors hover:bg-muted/40"
            >
              <span className="font-mono text-xs text-muted-foreground/60">{`0${index + 1}`}</span>
              <div className="mt-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ================= CLOSING BAND ================= */}
      <section className="container mx-auto px-4 pt-12 sm:pt-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center justify-between gap-5 rounded-3xl border border-border bg-card px-6 py-7 text-center sm:px-10 md:flex-row md:text-left"
        >
          <div>
            <h2 className="font-display text-xl font-semibold sm:text-2xl">
              {t('home.closing_title')}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{t('home.closing_description')}</p>
          </div>
          <a href={`tel:${phoneNumber}`} className="shrink-0">
            <Button size="lg" variant="primary" leftIcon={<Phone className="h-5 w-5" />}>
              {t('home.call')}
            </Button>
          </a>
        </motion.div>
      </section>
    </div>
  );
}
