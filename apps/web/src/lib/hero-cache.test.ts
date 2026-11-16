import { describe, it, expect } from 'vitest';
import {
  HERO_CACHE_KEY,
  HERO_CACHE_MAX_AGE_MS,
  isAllowedImageUrl,
  readHeroCache,
  resolveHeroState,
  sanitizeHeroSlides,
  writeHeroCache,
} from './hero-cache';

const slide = (over: Record<string, unknown> = {}) => ({
  id: 's1',
  image_url: 'https://abc.ufs.sh/f/a.jpg',
  title: 'T',
  ...over,
});

function mem(initial?: string) {
  let v: string | null = initial ?? null;
  return {
    getItem: () => v,
    setItem: (_: string, x: string) => void (v = x),
    removeItem: () => void (v = null),
    peek: () => v,
  };
}

describe('resolveHeroState', () => {
  it('loading until something is known', () => {
    expect(resolveHeroState({ hasData: false, isError: false, count: 0 })).toBe('loading');
  });
  it('fallback for an empty list or an error', () => {
    expect(resolveHeroState({ hasData: true, isError: false, count: 0 })).toBe('fallback');
    expect(resolveHeroState({ hasData: false, isError: true, count: 0 })).toBe('fallback');
  });
  it('ready with slides, even if a refetch errored', () => {
    expect(resolveHeroState({ hasData: true, isError: true, count: 2 })).toBe('ready');
  });
});

describe('isAllowedImageUrl', () => {
  it('accepts UploadThing https hosts only', () => {
    expect(isAllowedImageUrl('https://utfs.io/f/x.jpg')).toBe(true);
    expect(isAllowedImageUrl('https://a.ufs.sh/f/x.jpg')).toBe(true);
    expect(isAllowedImageUrl('http://utfs.io/f/x.jpg')).toBe(false);
    expect(isAllowedImageUrl('https://evil.com/a.jpg')).toBe(false);
    expect(isAllowedImageUrl('https://ufs.sh.evil.com/a.jpg')).toBe(false);
    expect(isAllowedImageUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedImageUrl(42)).toBe(false);
  });
});

describe('sanitizeHeroSlides', () => {
  it('drops bad photos, clears bad phone photo and links', () => {
    const out = sanitizeHeroSlides([
      slide(),
      slide({ id: 's2', image_url: 'https://evil.com/a.jpg' }),
      slide({ id: 's3', mobile_image_url: 'http://x.ufs.sh/m.jpg', cta_url: 'javascript:alert(1)' }),
      slide({ id: 's4', cta_url: '/catalog' }),
      null,
      { id: 5 },
    ]);
    expect(out.map((s) => s.id)).toEqual(['s1', 's3', 's4']);
    expect(out[1].mobile_image_url).toBeNull();
    expect(out[1].cta_url).toBeNull();
    expect(out[2].cta_url).toBe('/catalog');
  });
  it('non-arrays give an empty list', () => {
    expect(sanitizeHeroSlides({})).toEqual([]);
  });
});

describe('hero cache', () => {
  it('round-trips', () => {
    const st = mem();
    writeHeroCache(sanitizeHeroSlides([slide()]), 1000, st);
    const c = readHeroCache(2000, st);
    expect(c?.savedAt).toBe(1000);
    expect(c?.slides[0].id).toBe('s1');
  });
  it('ignores malformed, expired and future entries', () => {
    expect(readHeroCache(0, mem('not json'))).toBeNull();
    expect(readHeroCache(0, mem('{"savedAt":"x","slides":[]}'))).toBeNull();
    const old = JSON.stringify({ savedAt: 1, slides: [slide()] });
    expect(readHeroCache(HERO_CACHE_MAX_AGE_MS + 10, mem(old))).toBeNull();
    const future = JSON.stringify({ savedAt: 10_000_000, slides: [slide()] });
    expect(readHeroCache(1000, mem(future))).toBeNull();
  });
  it('re-validates image URLs on read', () => {
    const raw = JSON.stringify({ savedAt: 1000, slides: [slide({ image_url: 'https://evil.com/a.jpg' })] });
    expect(readHeroCache(2000, mem(raw))).toBeNull();
  });
  it('an empty list clears the cache', () => {
    const st = mem(JSON.stringify({ savedAt: 1, slides: [slide()] }));
    writeHeroCache([], 2, st);
    expect(st.peek()).toBeNull();
  });
  it('survives a throwing storage', () => {
    const bad = {
      getItem: () => { throw new Error('x'); },
      setItem: () => { throw new Error('x'); },
      removeItem: () => { throw new Error('x'); },
    };
    expect(readHeroCache(1, bad)).toBeNull();
    expect(() => writeHeroCache(sanitizeHeroSlides([slide()]), 1, bad)).not.toThrow();
    expect(HERO_CACHE_KEY).toBe('hero-slides-cache');
  });
});
