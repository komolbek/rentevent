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
import type { HeroState } from '@/lib/hero-cache';

const AUTOPLAY_MS = 6500;

interface HeroSliderProps {
  /** Photo slides from the public hero endpoint, already filtered and ordered by the API. */
  slides: HeroSlide[];
  /** The built-in orange brand hero: the only slide while there are no photo slides. */
  fallback: ReactNode;
  /** loading → branded loader; fallback → orange hero; ready → carousel (loader until the first photo has decoded). */
  status: HeroState;
}

/** Same box as the final hero so swapping loader → photo → fallback never shifts the page. */
const HERO_BOX = 'min-h-[30rem] sm:min-h-[32rem] lg:min-h-[36rem]';
const LOADER_FADE_MS = 300;
/** If the first photo never settles (hung connection) the loader still has to go away. */
const LOADER_MAX_MS = 8000;

function HeroLoader({ done }: { done: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!done}
      data-hero-loader
      className={cn(
        'absolute inset-0 z-30 overflow-hidden rounded-3xl bg-muted transition-opacity ease-out motion-reduce:transition-none dark:bg-card',
        done ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
      style={{ transitionDuration: `${LOADER_FADE_MS}ms` }}
    >
      <div className="hero-shimmer absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" aria-hidden="true">
        <span className="hero-mark font-display text-5xl font-bold tracking-tight text-foreground/15 sm:text-6xl">
          re<span className="text-primary">.</span>
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden bg-primary/10" aria-hidden="true">
        <div className="hero-progress h-full w-1/3 rounded-full bg-primary" />
      </div>
    </div>
  );
}

const clampPct = (v: number | null | undefined) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 50;

/**
 * Home carousel after fair.rent's first screen. Photo slides from admin replace
 * the orange brand hero; with none (or while loading / on error) the orange hero
 * is the only slide. One slide: no controls. Several: autoplay that pauses on
 * hover/focus and a hidden tab, dots, arrows (≥640 px), swipe, and stillness for
 * prefers-reduced-motion.
 */
export function HeroSlider({ slides, fallback, status }: HeroSliderProps) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  // An image-only slide whose photo failed to load would be a blank block: skip it.
  const visible = (status === 'ready' ? slides : []).filter(
    (s) => !(failed.has(s.id) && !localizedField(s, 'title', locale) && !localizedField(s, 'subtitle', locale)),
  );
  const hasPhotos = visible.length > 0;
  const count = hasPhotos ? visible.length : 1;
  const [index, setIndex] = useState(0);
  // Loader: stays until the first photo has loaded and decoded (or there is nothing to wait for).
  const [settled, setSettled] = useState<ReadonlySet<string>>(new Set());
  const [introDone, setIntroDone] = useState(false);
  const [loaderGone, setLoaderGone] = useState(false);
  const settle = useCallback(
    (id: string) => setSettled((prev) => (prev.has(id) ? prev : new Set(prev).add(id))),
    [],
  );
  const firstId = visible[0]?.id;
  useEffect(() => {
    if (introDone) return;
    if (status === 'fallback' || (status === 'ready' && !hasPhotos)) setIntroDone(true);
    else if (status === 'ready' && firstId && settled.has(firstId)) setIntroDone(true);
  }, [introDone, status, hasPhotos, firstId, settled]);
  // Only a hung photo is timed out; while the list is loading the loader stays
  // (the request ends in slides or the fallback, never a blank box).
  const listKnown = status !== 'loading';
  useEffect(() => {
    if (!listKnown) return;
    const id = window.setTimeout(() => setIntroDone(true), LOADER_MAX_MS);
    return () => window.clearTimeout(id);
  }, [listKnown]);
  useEffect(() => {
    if (!introDone) return;
    const id = window.setTimeout(() => setLoaderGone(true), LOADER_FADE_MS + 50);
    return () => window.clearTimeout(id);
  }, [introDone]);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused || reduceMotion || !introDone) return;
    const id = window.setTimeout(() => go(index + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [count, index, paused, reduceMotion, introDone, go]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // A slide list that shrinks (admin deleted one) must not leave us past the end.
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);
  // `visible` can shrink mid-render (a photo failed to load): never index past it.
  const current = Math.min(index, count - 1);

  const renderSlide = (i: number) => {
    if (status === 'loading') return <div className={cn('h-full rounded-3xl', HERO_BOX)} aria-hidden="true" />;
    if (!hasPhotos) return fallback;
    const slide = visible[i];
    const title = localizedField(slide, 'title', locale);
    const subtitle = localizedField(slide, 'subtitle', locale);
    const label = localizedField(slide, 'cta_label', locale);
    const href = slide.cta_url?.trim() || '';
    const hasText = Boolean(title || subtitle);
    // One CTA only (the admin's). No label but a link on a slide with text → default label.
    const buttonLabel = label || (href && hasText ? t('home.hero_slide_cta') : '');
    const external = /^https?:\/\//.test(href);
    const linkProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
    // A title makes the photo decorative; an image-only slide needs a name.
    const alt = slide.alt?.trim() || (hasText ? '' : t('home.hero_slide_alt_fallback'));
    const first = i === 0;
    const focus = `${clampPct(slide.focal_x)}% ${clampPct(slide.focal_y)}%`;
    const mobileSrc = slide.mobile_image_url || null;
    const onError = () => {
      setFailed((prev) => new Set(prev).add(slide.id));
      if (first) settle(slide.id);
    };
    const onLoad = (e: { currentTarget: HTMLImageElement }) => {
      const img = e.currentTarget;      // decode() so the cross-fade never reveals a half-painted photo.
      // Never wait long: a backgrounded tab can postpone decode().
      const decoded = typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve();
      Promise.race([decoded, new Promise((r) => window.setTimeout(r, 600))]).then(() => settle(slide.id));
    };
    // A photo that finished loading before hydration never fires onLoad.
    const checkComplete = (el: HTMLImageElement | null) => {
      if (first && el && el.complete && el.naturalWidth > 0) settle(slide.id);
    };
    // Phones show the portrait photo if there is one; otherwise the desktop photo
    // is cropped around the focal point. ≥640 px always centres the desktop photo.
    const desktopClass = mobileSrc
      ? 'hidden object-cover sm:block'
      : 'object-cover [object-position:var(--fp)] sm:[object-position:50%_50%]';

    return (
      <div
        className="relative h-full min-h-[30rem] touch-pan-y overflow-hidden rounded-3xl bg-brand-graphite text-white sm:min-h-[32rem] lg:min-h-[36rem]"
        style={{ ['--fp' as string]: focus }}
      >
        <Image
          src={slide.image_url}
          alt={alt}
          fill
          priority={first && !mobileSrc}
          sizes="(max-width: 1280px) 100vw, 1280px"
          className={desktopClass}
          ref={checkComplete}
          onLoad={onLoad}
          onError={onError}
        />
        {mobileSrc && (
          <Image
            src={mobileSrc}
            alt={alt}
            fill
            sizes="100vw"
            className="object-cover sm:hidden"
            ref={checkComplete}
            onLoad={onLoad}
            onError={onError}
          />
        )}
        {hasText && (
          <>
            {/* Wash so white type holds on any photo: from the left on ≥640 px, from the bottom on phones. */}
            <div
              className="absolute inset-0 hidden sm:block"
              aria-hidden="true"
              style={{
                background:
                  'linear-gradient(90deg, rgba(23,23,23,0.86) 0%, rgba(23,23,23,0.62) 38%, rgba(23,23,23,0.08) 72%)',
              }}
            />
            <div
              className="absolute inset-0 sm:hidden"
              aria-hidden="true"
              style={{
                background:
                  'linear-gradient(0deg, rgba(23,23,23,0.88) 0%, rgba(23,23,23,0.55) 45%, rgba(23,23,23,0) 80%)',
              }}
            />
          </>
        )}
        {hasText && (
          <div className="relative z-10 flex h-full min-h-[inherit] max-w-2xl flex-col justify-end px-6 pb-28 pt-14 sm:justify-center sm:px-10 md:px-14">
            {title && (
              <h2 className="font-display text-[2rem] font-semibold leading-[1.06] tracking-tight sm:text-5xl lg:text-[3.5rem]">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-4 line-clamp-2 max-w-xl text-base text-white/85 sm:line-clamp-none sm:text-lg">{subtitle}</p>
            )}
            {buttonLabel && (
              <div className="mt-8">
                <Link
                  href={href || '/catalog'}
                  {...linkProps}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-brand-graphite shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:w-auto"
                >
                  {buttonLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            )}
          </div>
        )}
        {/* Image-only slide with a link: the whole slide is the link. */}
        {!hasText && href && (
          <Link
            href={href}
            {...linkProps}
            className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white/70"
            aria-label={label || alt}
          />
        )}
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
      onKeyDown={(e) => {
        if (count < 2) return;
        if (e.key === 'ArrowLeft') go(index - 1);
        else if (e.key === 'ArrowRight') go(index + 1);
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (count > 1 && Math.abs(dx) > 48) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="relative">
        {/* Slides stack in one grid cell so the tallest sets the height and
            nothing jumps when they change. */}
        <div className="relative grid">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={status === 'ready' && visible[current] ? visible[current].id : `s${current}`}
              className="col-start-1 row-start-1"
              initial={reduceMotion ? false : { opacity: 0, scale: 1.01 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${current + 1} / ${count}`}
            >
              {renderSlide(current)}
            </motion.div>
          </AnimatePresence>
          {!loaderGone && <HeroLoader done={introDone} />}
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
                  className="group flex h-6 items-center px-2 focus-visible:outline-none"
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
