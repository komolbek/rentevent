import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { buildHeroBody, focalFromClick, heroSlideStatus, isAllowedImageUrl, isAllowedLinkUrl } from '@rentevent/validators';
import {
  ContentService,
  MAX_HERO_SLIDES,
  formatTashkentDay,
  parseTashkentDay,
  publicWhere,
  validateOrderedIds,
} from './content.service';
import { HERO_SLIDES_CACHE_CONTROL } from './content.controller';

const IMG = 'https://abc123.ufs.sh/f/key1';

function makeService(opts: { rows?: any[]; count?: number; existing?: any; updated?: any } = {}) {
  const model = {
    findMany: vi.fn().mockResolvedValue(opts.rows ?? []),
    findUnique: vi.fn().mockResolvedValue(opts.existing ?? null),
    findFirst: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(opts.count ?? 0),
    create: vi.fn().mockImplementation(async ({ data }: any) => ({ id: 'n', ...data })),
    update: vi.fn().mockImplementation(async ({ data }: any) => opts.updated ?? { id: 'n', ...opts.existing, ...data }),
    delete: vi.fn(),
  };
  const prisma: any = { heroSlide: model, inspiration: model, $transaction: vi.fn(async (x: unknown[]) => x) };
  const uploads = { deleteFile: vi.fn().mockResolvedValue(true) };
  return { svc: new ContentService(prisma, uploads as any), model, prisma, uploads };
}

describe('host and link validators', () => {
  it('accepts only https UploadThing hosts', () => {
    expect(isAllowedImageUrl(IMG)).toBe(true);
    expect(isAllowedImageUrl('https://utfs.io/f/x')).toBe(true);
    expect(isAllowedImageUrl('http://abc.ufs.sh/f/x')).toBe(false);
    expect(isAllowedImageUrl('https://evil.com/ufs.sh')).toBe(false);
    expect(isAllowedImageUrl('https://ufs.sh.evil.com/x')).toBe(false);
    expect(isAllowedImageUrl('https://ufs.sh/x')).toBe(false);
    expect(isAllowedImageUrl('https://user:pw@abc.ufs.sh/x')).toBe(false);
    expect(isAllowedImageUrl('javascript:alert(1)')).toBe(false);
  });
  it('accepts relative paths and http(s) links only', () => {
    expect(isAllowedLinkUrl('/catalog')).toBe(true);
    expect(isAllowedLinkUrl('https://rentevent.uz/x')).toBe(true);
    expect(isAllowedLinkUrl('//evil.com')).toBe(false);
    expect(isAllowedLinkUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedLinkUrl('data:text/html,x')).toBe(false);
    expect(isAllowedLinkUrl('/a b')).toBe(false);
    expect(isAllowedLinkUrl('catalog')).toBe(false);
  });
});

describe('schedule', () => {
  it('maps whole Tashkent days to UTC instants and back', () => {
    expect(parseTashkentDay('2026-12-01', false)?.toISOString()).toBe('2026-11-30T19:00:00.000Z');
    expect(parseTashkentDay('2026-12-01', true)?.toISOString()).toBe('2026-12-01T18:59:59.999Z');
    expect(formatTashkentDay(new Date('2026-11-30T19:00:00.000Z'))).toBe('2026-12-01');
    expect(formatTashkentDay(new Date('2026-12-01T18:59:59.999Z'))).toBe('2026-12-01');
    expect(parseTashkentDay('2026-02-30', false)).toBeNull();
    expect(parseTashkentDay('01.12.2026', false)).toBeNull();
  });

  it('public filter: active and inside the window for hero slides, mock clock', async () => {
    const now = new Date('2026-12-01T10:00:00Z');
    expect(publicWhere('heroSlide', now)).toEqual({
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    });
    expect(publicWhere('inspiration', now)).toEqual({ isActive: true });
    const { svc, model } = makeService();
    await svc.listPublic('heroSlide', now);
    expect(model.findMany.mock.calls[0][0].where).toEqual(publicWhere('heroSlide', now));
  });

  it('serialises the schedule as YYYY-MM-DD', async () => {
    const row = {
      id: 'a', imageUrl: IMG, title: '', isActive: true, displayOrder: 0,
      startsAt: new Date('2026-11-30T19:00:00.000Z'), endsAt: new Date('2026-12-05T18:59:59.999Z'),
    };
    const { svc } = makeService({ rows: [row] });
    const { items } = await svc.listPublic('heroSlide');
    expect(items[0]).toMatchObject({ starts_at: '2026-12-01', ends_at: '2026-12-05', mobile_image_url: null, focal_x: null });
  });

  it('create: dates parsed, end before start rejected', async () => {
    const { svc, model } = makeService();
    await svc.create('heroSlide', { image_url: IMG, starts_at: '2026-12-01', ends_at: '2026-12-01' });
    const data = model.create.mock.calls[0][0].data;
    expect(data.startsAt.toISOString()).toBe('2026-11-30T19:00:00.000Z');
    expect(data.endsAt.toISOString()).toBe('2026-12-01T18:59:59.999Z');
    expect(data.title).toBe('');
    await expect(svc.create('heroSlide', { image_url: IMG, starts_at: '2026-12-02', ends_at: '2026-12-01' })).rejects.toThrow(BadRequestException);
    await expect(svc.create('heroSlide', { image_url: IMG, starts_at: 'tomorrow' })).rejects.toThrow(BadRequestException);
  });

  it('update: end checked against the stored start', async () => {
    const existing = { id: 'a', imageUrl: IMG, startsAt: new Date('2026-12-09T19:00:00.000Z') }; // 2026-12-10
    const { svc } = makeService({ existing });
    await expect(svc.update('heroSlide', 'a', { ends_at: '2026-12-09' })).rejects.toThrow(BadRequestException);
    await expect(svc.update('heroSlide', 'a', { ends_at: '2026-12-10' })).resolves.toBeDefined();
  });
});

describe('hero input validation', () => {
  const bad = (body: Record<string, unknown>) => {
    const { svc } = makeService();
    return expect(svc.create('heroSlide', { image_url: IMG, ...body })).rejects.toThrow(BadRequestException);
  };

  it('requires an allowed image_url, title optional', async () => {
    const { svc } = makeService();
    await expect(svc.create('heroSlide', {})).rejects.toThrow(BadRequestException);
    await expect(svc.create('heroSlide', { image_url: 'https://evil.com/a.jpg' })).rejects.toThrow(BadRequestException);
    await expect(svc.create('heroSlide', { image_url: IMG })).resolves.toBeDefined();
  });
  it('inspirations still require a title', async () => {
    const { svc } = makeService();
    await expect(svc.create('inspiration', { image_url: IMG })).rejects.toThrow(BadRequestException);
    await expect(svc.create('inspiration', { image_url: IMG, title: 'x', link_url: 'javascript:x' })).rejects.toThrow(BadRequestException);
  });
  it('rejects bad cta_url, mobile url, lengths', async () => {
    await bad({ cta_url: 'javascript:alert(1)' });
    await bad({ cta_url: '//evil.com' });
    await bad({ mobile_image_url: 'http://x.ufs.sh/a' });
    await bad({ title: 'x'.repeat(121) });
    await bad({ subtitle: 'x'.repeat(301) });
    await bad({ cta_label_uz: 'x'.repeat(41) });
    await bad({ cta_url: '/' + 'x'.repeat(500) });
    await bad({ alt: 'x'.repeat(201) });
    await bad({ image_key: 5 });
  });
  it('focal point must be an integer 0-100; alt empty becomes null', async () => {
    await bad({ focal_x: 101 });
    await bad({ focal_y: -1 });
    await bad({ focal_x: 50.5 });
    await bad({ focal_x: '50' });
    const { svc, model } = makeService();
    await svc.create('heroSlide', { image_url: IMG, focal_x: 30, alt: '  ', cta_url: '/catalog', cta_label: '' });
    expect(model.create.mock.calls[0][0].data).toMatchObject({ focalX: 30, alt: null, ctaUrl: '/catalog', ctaLabel: null });
  });
  it('mobile key needs its url; clearing the url clears the key', async () => {
    await bad({ mobile_image_key: 'k' });
    const { svc, model } = makeService({ existing: { id: 'a', imageUrl: IMG, mobileImageUrl: IMG } });
    await svc.update('heroSlide', 'a', { mobile_image_url: null });
    expect(model.update.mock.calls[0][0].data).toMatchObject({ mobileImageUrl: null, mobileImageKey: null });
  });
  it('caps hero slides at the maximum', async () => {
    const { svc } = makeService({ count: MAX_HERO_SLIDES });
    await expect(svc.create('heroSlide', { image_url: IMG })).rejects.toThrow(BadRequestException);
  });
});

describe('reorder', () => {
  it('validates the payload shape', () => {
    expect(validateOrderedIds(['a', 'b'])).toEqual(['a', 'b']);
    for (const v of [undefined, [], 'a', [1], [''], ['a', 'a'], Array.from({ length: 51 }, (_, i) => `i${i}`)]) {
      expect(() => validateOrderedIds(v)).toThrow(BadRequestException);
    }
  });
  it('rejects unknown ids with 400, no writes', async () => {
    const { svc, prisma } = makeService({ rows: [{ id: 'a' }] });
    await expect(svc.reorder('heroSlide', ['a', 'zzz'])).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('persists indexes in one transaction', async () => {
    const { svc, model, prisma } = makeService({ rows: [{ id: 'a' }, { id: 'b' }] });
    await svc.reorder('heroSlide', ['b', 'a']);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(model.update.mock.calls.map((c: any) => [c[0].where.id, c[0].data.displayOrder])).toEqual([['b', 0], ['a', 1]]);
  });
});

describe('public endpoint cache', () => {
  it('sets the agreed Cache-Control', () => {
    expect(HERO_SLIDES_CACHE_CONTROL).toBe('public, max-age=60, s-maxage=300, stale-while-revalidate=600');
  });
});

describe('UploadThing cleanup (H3)', () => {
  const existing = { id: 'a', imageUrl: IMG, imageKey: 'k-old', mobileImageUrl: 'https://abc.ufs.sh/f/m1', mobileImageKey: 'm-old' };

  it('replacing the photo deletes the old key and stores the new one', async () => {
    const { svc, uploads, model } = makeService({ existing });
    await svc.update('heroSlide', 'a', { image_url: 'https://abc.ufs.sh/f/new', image_key: 'k-new' });
    expect(model.update.mock.calls[0][0].data).toMatchObject({ imageKey: 'k-new' });
    expect(uploads.deleteFile.mock.calls).toEqual([['k-old']]);
  });
  it('a new URL without a key drops the stale key instead of keeping the old one', async () => {
    const { svc, uploads, model } = makeService({ existing });
    await svc.update('heroSlide', 'a', { image_url: 'https://abc.ufs.sh/f/new' });
    expect(model.update.mock.calls[0][0].data.imageKey).toBeNull();
    expect(uploads.deleteFile).toHaveBeenCalledWith('k-old');
  });
  it('removing the mobile photo deletes its file', async () => {
    const { svc, uploads } = makeService({ existing });
    await svc.update('heroSlide', 'a', { mobile_image_url: null });
    expect(uploads.deleteFile.mock.calls).toEqual([['m-old']]);
  });
  it('an edit that keeps the photos deletes nothing', async () => {
    const { svc, uploads } = makeService({ existing });
    await svc.update('heroSlide', 'a', { title: 'x', image_url: IMG });
    expect(uploads.deleteFile).not.toHaveBeenCalled();
  });
  it('deleting a slide deletes both files', async () => {
    const { svc, uploads } = makeService({ existing });
    await svc.delete('heroSlide', 'a');
    expect(uploads.deleteFile.mock.calls.map((c: any) => c[0]).sort()).toEqual(['k-old', 'm-old']);
  });
  it('a failing file delete never fails the request', async () => {
    const { svc, uploads } = makeService({ existing });
    uploads.deleteFile.mockRejectedValue(new Error('boom'));
    await expect(svc.delete('heroSlide', 'a')).resolves.toEqual({ deleted: true });
    await expect(svc.update('heroSlide', 'a', { mobile_image_url: null })).resolves.toBeDefined();
  });
  it('inspirations never touch UploadThing', async () => {
    const { svc, uploads } = makeService({ existing: { ...existing, title: 'x' } });
    await svc.delete('inspiration', 'a');
    expect(uploads.deleteFile).not.toHaveBeenCalled();
  });
});

describe('admin helpers (H4)', () => {
  it('slide status: hidden > scheduled > ended > live, inclusive days', () => {
    const s = (o: any) => heroSlideStatus({ is_active: true, ...o }, '2026-12-05');
    expect(heroSlideStatus({ is_active: false }, '2026-12-05')).toBe('hidden');
    expect(heroSlideStatus({ is_active: false, starts_at: '2027-01-01' }, '2026-12-05')).toBe('hidden');
    expect(s({})).toBe('live');
    expect(s({ starts_at: '2026-12-06' })).toBe('scheduled');
    expect(s({ starts_at: '2026-12-05' })).toBe('live');
    expect(s({ ends_at: '2026-12-05' })).toBe('live');
    expect(s({ ends_at: '2026-12-04' })).toBe('ended');
  });
  it('focal point from a click: percent of the box, clamped, integer', () => {
    const rect = { left: 100, top: 50, width: 400, height: 200 };
    expect(focalFromClick(300, 150, rect)).toEqual({ x: 50, y: 50 });
    expect(focalFromClick(140, 60, rect)).toEqual({ x: 10, y: 5 });
    expect(focalFromClick(0, 9999, rect)).toEqual({ x: 0, y: 100 });
    expect(focalFromClick(1, 1, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 50, y: 50 });
  });
  it('hero form body: snake_case, empty -> null, focal as integers', () => {
    const body = buildHeroBody(
      { image_url: IMG, image_key: 'k', mobile_image_url: '', mobile_image_key: 'stale', alt: ' ', focal_x: '30', focal_y: '', starts_at: '2026-12-01', ends_at: '', title: '' },
      true,
    );
    expect(body).toMatchObject({
      image_url: IMG, image_key: 'k', mobile_image_url: null, mobile_image_key: null, alt: null,
      focal_x: 30, focal_y: null, starts_at: '2026-12-01', ends_at: null, is_active: true, title: '',
    });
  });
});
