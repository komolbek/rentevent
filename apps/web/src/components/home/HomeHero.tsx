'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Phone, PackageCheck, CalendarClock, Truck, Undo2 } from 'lucide-react';
import type { Product } from '@/types';
import { Button } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { localizedName } from '@/lib/i18n/product';

interface HomeHeroProps {
  products: Product[];
  productTotal?: number;
  phoneNumber: string;
}

/**
 * Fire-orange hero. The brand's one loud colour carries the first screen;
 * everything below it stays on the warm paper so the page still breathes.
 * Catalogue photos are white/grey studio cutouts, so they sit on white cards
 * that pop against the orange instead of fighting it.
 */
export function HomeHero({ products, productTotal, phoneNumber }: HomeHeroProps) {
  const { t, locale } = useTranslation();

  const collage = products.filter((p) => p.photos?.[0]).slice(0, 3);

  const stats = [
    {
      icon: PackageCheck,
      label:
        productTotal !== undefined
          ? t('home.hero_stat_items', { count: productTotal })
          : t('home.hero_stat_items_fallback'),
    },
    { icon: CalendarClock, label: t('home.hero_stat_min') },
    { icon: Truck, label: t('home.hero_stat_delivery') },
    { icon: Undo2, label: t('home.hero_stat_cancel') },
  ];

  return (
    <section className="container mx-auto px-4 pt-4 sm:pt-6">
      {/* The first screen never starts invisible — only the collage cards animate in. */}
      <div
        className="relative overflow-hidden rounded-3xl text-white"
        style={{
          background:
            'linear-gradient(120deg, #F2562B 0%, #E9481F 45%, #C2431D 100%)',
        }}
      >
        {/* Grain + two soft highlights so the orange reads as a surface, not a flat fill. */}
        <div className="u-grain pointer-events-none absolute inset-0" aria-hidden="true">
          <div
            className="absolute -left-20 -top-24 h-[22rem] w-[22rem] rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(255,214,170,0.55), transparent 65%)' }}
          />
          <div
            className="absolute -bottom-32 right-1/3 h-[24rem] w-[24rem] rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, rgba(111,36,17,0.55), transparent 65%)' }}
          />
        </div>

        <div className="relative z-10 grid items-center gap-8 px-5 pb-6 pt-8 sm:px-10 sm:pb-8 sm:pt-10 md:px-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-14">
          <div>
            <p className="eyebrow mb-4 inline-flex items-center gap-2 text-white/85">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              {t('home.hero_badge')}
            </p>

            <h1 className="font-display max-w-2xl text-[1.85rem] font-semibold leading-[1.08] tracking-tight sm:text-4xl lg:text-[3.25rem]">
              {t('home.hero_title')}
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">
              {t('home.hero_subtitle')}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/catalog">
                <Button
                  size="lg"
                  className="bg-white text-brand-graphite shadow-[0_10px_30px_-10px_rgba(0,0,0,0.45)] hover:bg-white hover:brightness-95"
                  rightIcon={<ArrowRight className="h-5 w-5" />}
                >
                  {t('home.view_catalog')}
                </Button>
              </Link>
              <a href={`tel:${phoneNumber}`}>
                <Button
                  size="lg"
                  className="border border-white/35 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                  leftIcon={<Phone className="h-5 w-5" />}
                >
                  {t('home.call')}
                </Button>
              </a>
            </div>

            {/* Concrete facts, not adjectives — each one is sourced from the FAQ / delivery pages. */}
            <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-white/90 sm:flex sm:flex-wrap sm:gap-x-7">
              {stats.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-white/80" />
                  <span className="font-medium">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Product collage — three real items, each linking to its page. */}
          {collage.length === 3 && (
            <div className="relative h-[13rem] sm:h-[15rem] lg:h-[19rem]">
              {[
                {
                  card: 'left-0 top-2 h-[8rem] w-[9.5rem] -rotate-3 sm:h-[10rem] sm:w-[12rem] lg:h-[11rem] lg:w-[13rem]',
                  price: 'left-2 top-2',
                },
                {
                  card: 'right-0 top-0 h-[9rem] w-[10.5rem] rotate-2 sm:h-[11.5rem] sm:w-[13.5rem] lg:h-[12.5rem] lg:w-[14.5rem]',
                  price: 'right-2 bottom-2',
                },
                {
                  card: 'bottom-0 left-1/2 h-[8.5rem] w-[10.5rem] -translate-x-1/2 rotate-1 sm:h-[10.5rem] sm:w-[13.5rem] lg:h-[11.5rem] lg:w-[15rem]',
                  price: 'left-2 bottom-2',
                },
              ].map((position, index) => {
                const product = collage[index];
                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 18, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.15 + index * 0.1, ease: [0.16, 1, 0.3, 1], duration: 0.6 }}
                    className={`absolute ${position.card}`}
                  >
                    <Link
                      href={`/product/${product.id}`}
                      className="group block h-full w-full overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_-14px_rgba(60,15,5,0.55)] ring-1 ring-black/5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:rotate-0"
                      aria-label={localizedName(product, locale)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.photos[0]}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                        loading="eager"
                      />
                      <span
                        className={`absolute rounded-full bg-brand-graphite/85 px-2.5 py-1 text-[0.6875rem] font-medium text-white backdrop-blur-sm ${position.price}`}
                      >
                        {t('home.collage_price', { price: formatPrice(product.dailyPrice) })}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
