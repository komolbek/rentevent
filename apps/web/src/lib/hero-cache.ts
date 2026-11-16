import type { HeroSlide } from '@/lib/api';

export const HERO_CACHE_KEY = 'hero-slides-cache';
/** A cached list older than this is ignored (the admin may have changed everything). */
export const HERO_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type HeroState = 'loading' | 'fallback' | 'ready';

/**
 * loading  — nothing known yet: show the branded loader, never the orange hero.
 * fallback — loaded with no photo slides, or the request failed: the orange hero.
 * ready    — at least one photo slide: the carousel.
 */
export function resolveHeroState(input: { hasData: boolean; isError: boolean; count: number }): HeroState {
  if (input.count > 0) return 'ready';
  if (input.hasData || input.isError) return 'fallback';
  return 'loading';
}

/** Same hosts as `images.remotePatterns` in next.config.ts (UploadThing only). */
export function isAllowedImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && (u.hostname === 'utfs.io' || u.hostname.endsWith('.ufs.sh'));
  } catch {
    return false;
  }
}

const safeLink = (v: unknown): string | null =>
  typeof v === 'string' && /^(\/(?!\/)|https?:\/\/)/.test(v.trim()) ? v : null;

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/**
 * Drops slides whose photo is not an allowed https UploadThing URL (next/image
 * would throw on them), clears a bad phone photo or link, and keeps only the
 * fields the hero reads. Used on cache reads and on fresh API data.
 */
export function sanitizeHeroSlides(input: unknown): HeroSlide[] {
  if (!Array.isArray(input)) return [];
  const out: HeroSlide[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const s = raw as Record<string, unknown>;
    if (typeof s.id !== 'string' || !s.id || !isAllowedImageUrl(s.image_url)) continue;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    out.push({
      id: s.id,
      image_url: s.image_url,
      mobile_image_url: isAllowedImageUrl(s.mobile_image_url) ? s.mobile_image_url : null,
      focal_x: num(s.focal_x),
      focal_y: num(s.focal_y),
      alt: str(s.alt),
      title: typeof s.title === 'string' ? s.title : '',
      title_uz: str(s.title_uz),
      title_en: str(s.title_en),
      subtitle: str(s.subtitle),
      subtitle_uz: str(s.subtitle_uz),
      subtitle_en: str(s.subtitle_en),
      cta_label: str(s.cta_label),
      cta_label_uz: str(s.cta_label_uz),
      cta_label_en: str(s.cta_label_en),
      cta_url: safeLink(s.cta_url),
    });
  }
  return out;
}

export interface HeroCache {
  slides: HeroSlide[];
  savedAt: number;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const defaultStorage = (): StorageLike | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

/** The last good slide list, or null when absent, malformed, empty or too old. */
export function readHeroCache(
  now: number = Date.now(),
  storage: StorageLike | null = defaultStorage(),
): HeroCache | null {
  try {
    const raw = storage?.getItem(HERO_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: unknown; slides?: unknown };
    const savedAt = typeof parsed.savedAt === 'number' ? parsed.savedAt : NaN;
    if (!Number.isFinite(savedAt) || savedAt > now + 60_000 || now - savedAt > HERO_CACHE_MAX_AGE_MS) return null;
    const slides = sanitizeHeroSlides(parsed.slides);
    return slides.length > 0 ? { slides, savedAt } : null;
  } catch {
    return null;
  }
}

/** Remembers the list; an empty list clears the cache so removed slides do not linger. */
export function writeHeroCache(
  slides: HeroSlide[],
  now: number = Date.now(),
  storage: StorageLike | null = defaultStorage(),
): void {
  try {
    if (!storage) return;
    if (slides.length === 0) storage.removeItem(HERO_CACHE_KEY);
    else storage.setItem(HERO_CACHE_KEY, JSON.stringify({ savedAt: now, slides }));
  } catch {
    /* private mode / quota: the cache is only an optimisation */
  }
}
