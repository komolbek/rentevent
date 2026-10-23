'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { HeroSlide } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { localizedField } from '@/lib/i18n/product';
import { cn } from '@/lib/utils';

const AUTOPLAY_MS = 6500;

interface HeroSliderProps {
  /** Admin slides (admin → Главный экран). Empty → `fallback` is the only slide. */
  slides: HeroSlide[];
  /** The built-in brand slide, shown first, always — the site is never an empty photo. */
  fallback: ReactNode;
}

/**
 * Full-width carousel after fair.rent's first screen: a photo per slide with
 * a text panel on the left, dots and arrows at the bottom. Autoplays, pauses
 * on hover/focus and when the tab is hidden, swipes on touch, and stays still
 * for prefers-reduced-motion. The first slide is never invisible — only the
 * slides after it fade in.
 */
export function HeroSlider({ slides, fallback }: HeroSliderProps) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const count = slides.length + 1;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused || reduceMotion) return;
    const id = window.setTimeout(() => go(index + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [count, index, paused, reduceMotion, go]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // A slide list that shrinks (admin deleted one) must not leave us past the end.
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  const renderSlide = (i: number) => {
    if (i === 0) return fallback;
    const slide = slides[i - 1];
    const title = localizedField(slide, 'title', locale);
    const subtitle = localizedField(slide, 'subtitle', locale);
    const cta = localizedField(slide, 'cta_label', locale) || t('home.hero_slide_cta');
    const href = slide.cta_url?.trim() || '/catalog';
    const external = /^https?:\/\//.test(href);
    return (
      <div className="relative h-full min-h-[30rem] overflow-hidden rounded-3xl bg-brand-graphite text-white sm:min-h-[32rem] lg:min-h-[36rem]">
        <Image
          src={slide.image_url}
          alt=""
          fill
          priority={i === 1}
          sizes="(max-width: 1280px) 100vw, 1280px"
          className="object-cover"
        />
        {/* Graphite-to-clear wash so white type holds on any photo, with an
            orange ember at the bottom-left to keep the slide on-brand. */}
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(90deg, rgba(23,23,23,0.86) 0%, rgba(23,23,23,0.62) 38%, rgba(23,23,23,0.08) 72%), radial-gradient(60% 70% at 0% 100%, rgba(242,86,43,0.55), transparent 70%)',
          }}
        />
        <div className="relative z-10 flex h-full min-h-[inherit] max-w-2xl flex-col justify-center px-6 pb-28 pt-14 sm:px-10 md:px-14">
          <h2 className="font-display text-[2rem] font-semibold leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.5rem]">
            {title}
          </h2>
          {subtitle && <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">{subtitle}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={href}
              {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-brand-graphite shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {cta}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/catalog"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-rent px-6 text-sm font-bold uppercase tracking-[0.08em] text-white shadow-[0_10px_30px_-10px_rgba(217,44,30,0.9)] transition-colors hover:bg-rent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {t('header.rent_now')}
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section
      data-hero
      className="container mx-auto px-4 pt-4 sm:pt-6"
      aria-roledescription="carousel"
      aria-label={t('home.hero_carousel_label')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 48) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="relative">
        {/* Slides stack in one grid cell so the tallest sets the height and
            nothing jumps when they change. */}
        <div className="grid">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={index}
              className="col-start-1 row-start-1"
              initial={reduceMotion ? false : { opacity: 0, scale: 1.01 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} / ${count}`}
            >
              {renderSlide(index)}
            </motion.div>
          </AnimatePresence>
        </div>

        {count > 1 && (
          <div className="absolute inset-x-0 bottom-12 z-20 flex items-center justify-center gap-3 sm:bottom-14">
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="hidden h-10 w-10 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:inline-flex"
              aria-label={t('home.hero_prev')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1 rounded-full bg-black/25 px-2 py-1.5 backdrop-blur-sm">
              {Array.from({ length: count }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={t('home.hero_go_to', { n: i + 1 })}
                  aria-current={i === index ? 'true' : undefined}
                  className="group flex h-6 items-center px-1 focus-visible:outline-none"
                >
                  <span
                    className={cn(
                      'block h-2 rounded-full transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-white',
                      i === index ? 'w-7 bg-white' : 'w-2 bg-white/50 group-hover:bg-white/80',
                    )}
                  />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(index + 1)}
              className="hidden h-10 w-10 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:inline-flex"
              aria-label={t('home.hero_next')}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
