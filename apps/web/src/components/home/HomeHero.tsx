'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, PackageCheck, CalendarClock, Truck, Undo2 } from 'lucide-react';
import type { Product } from '@/types';
import { Button } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { localizedName } from '@/lib/i18n/product';
import { CollageCard } from './CollageCard';

interface HomeHeroSlideProps {
  products: Product[];
  productTotal?: number;
}

/**
 * Fire-orange brand slide — the first slide of the home carousel, and the
 * whole first screen until admin adds photo slides. Catalogue photos are
 * white/grey studio cutouts, so they sit on white cards that pop against the
 * orange instead of fighting it.
 */
export function HomeHeroSlide({ products, productTotal }: HomeHeroSlideProps) {
  const { t, locale } = useTranslation();
  const [hovered, setHovered] = useState<number | null>(null);

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
    // The first screen never starts invisible — only the collage cards animate in.
    <div
        className="relative flex h-full min-h-[30rem] items-center overflow-hidden rounded-3xl text-white sm:min-h-[32rem] lg:min-h-[36rem]"
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

        <div className="relative z-10 grid w-full items-center gap-8 px-5 pb-28 pt-8 sm:px-10 sm:pt-10 md:px-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-28 lg:pt-14">
          <div>
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
              <Link
                href="/events"
                className="inline-flex h-12 items-center rounded-full bg-rent px-6 text-sm font-bold uppercase tracking-[0.08em] text-white shadow-[0_10px_30px_-10px_rgba(120,10,0,0.8)] transition-colors hover:bg-rent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {t('header.rent_now')}
              </Link>
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

          {/* Product collage — three real items, each linking to its page. The
              position lives on a plain wrapper; CollageCard owns the motion. */}
          {collage.length === 3 && (
            <div className="relative h-[13rem] sm:h-[15rem] lg:h-[19rem]" onPointerLeave={() => setHovered(null)}>
              {[
                {
                  box: 'left-0 top-2 h-[8rem] w-[9.5rem] sm:h-[10rem] sm:w-[12rem] lg:h-[11rem] lg:w-[13rem]',
                  rotate: -3,
                  price: 'left-2 bottom-2',
                },
                {
                  box: 'right-0 top-0 h-[9rem] w-[10.5rem] sm:h-[11.5rem] sm:w-[13.5rem] lg:h-[12.5rem] lg:w-[14.5rem]',
                  rotate: 2,
                  price: 'left-2 bottom-2',
                },
                {
                  box: 'bottom-0 left-1/2 h-[8.5rem] w-[10.5rem] -translate-x-1/2 sm:h-[10.5rem] sm:w-[13.5rem] lg:h-[11.5rem] lg:w-[15rem]',
                  rotate: 1,
                  price: 'left-2 bottom-2',
                },
              ].map((position, index) => {
                const product = collage[index];
                return (
                  <div
                    key={product.id}
                    className={`absolute ${position.box}`}
                    style={{ zIndex: hovered === index ? 30 : 10 + index }}
                  >
                    <CollageCard
                      href={`/product/${product.id}`}
                      photo={product.photos[0]}
                      name={localizedName(product, locale)}
                      priceLabel={t('home.collage_price', { price: formatPrice(product.dailyPrice) })}
                      ctaLabel={t('home.collage_cta')}
                      restRotate={position.rotate}
                      pricePosition={position.price}
                      active={hovered === index}
                      dimmed={hovered !== null && hovered !== index}
                      onHoverChange={(on) => setHovered((cur) => (on ? index : cur === index ? null : cur))}
                      entranceDelay={0.1 + index * 0.08}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
  );
}
