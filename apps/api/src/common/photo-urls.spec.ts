import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { assertPhotoUrls, isUploadThingUrl } from './photo-urls';
import { ReviewsService } from '../reviews/reviews.service';
import { ReturnsService } from '../returns/returns.service';

const OK = 'https://abc123.ufs.sh/f/key-1';
const LEGACY = 'https://utfs.io/f/key-2';

describe('isUploadThingUrl', () => {
  it('accepts https UploadThing hosts', () => {
    expect(isUploadThingUrl(OK)).toBe(true);
    expect(isUploadThingUrl(LEGACY)).toBe(true);
  });

  it('rejects other schemes and hosts', () => {
    expect(isUploadThingUrl('javascript:alert(1)')).toBe(false);
    expect(isUploadThingUrl('data:image/png;base64,AAAA')).toBe(false);
    expect(isUploadThingUrl('http://abc.ufs.sh/f/k')).toBe(false);
    expect(isUploadThingUrl('https://evil.example.com/f/k')).toBe(false);
    expect(isUploadThingUrl('https://ufs.sh.evil.com/f/k')).toBe(false);
    expect(isUploadThingUrl('https://evilufs.sh/f/k')).toBe(false);
    expect(isUploadThingUrl('https://utfs.io.evil.com/f/k')).toBe(false);
    expect(isUploadThingUrl('https://user:pw@abc.ufs.sh/f/k')).toBe(false);
    expect(isUploadThingUrl('not a url')).toBe(false);
    expect(isUploadThingUrl(42)).toBe(false);
  });
});

describe('assertPhotoUrls', () => {
  it('passes valid lists and treats missing as empty', () => {
    expect(assertPhotoUrls([OK, LEGACY])).toEqual([OK, LEGACY]);
    expect(assertPhotoUrls(undefined)).toEqual([]);
  });

  it('rejects a javascript: URL, another host and 11 photos', () => {
    expect(() => assertPhotoUrls(['javascript:alert(1)'])).toThrow(BadRequestException);
    expect(() => assertPhotoUrls(['https://evil.example.com/a.png'])).toThrow(BadRequestException);
    expect(() => assertPhotoUrls(Array(11).fill(OK))).toThrow(BadRequestException);
    expect(assertPhotoUrls(Array(10).fill(OK))).toHaveLength(10);
  });

  it('rejects a non-array', () => {
    expect(() => assertPhotoUrls('https://abc.ufs.sh/f/k')).toThrow(BadRequestException);
  });
});

describe('photos on reviews and returns', () => {
  const bad = ['javascript:alert(1)'];

  it('createReview rejects bad photos before touching the database', async () => {
    const prisma = { order: { findFirst: vi.fn() }, review: { create: vi.fn() } };
    const service = new ReviewsService(prisma as any);
    await expect(
      service.createReview('u1', { product_id: 'p1', rating: 5, photos: bad }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.order.findFirst).not.toHaveBeenCalled();
  });

  it('createReview stores valid photos', async () => {
    const prisma = {
      order: { findFirst: vi.fn(async () => ({ id: 'o1' })) },
      review: { findUnique: vi.fn(async () => null), create: vi.fn(async (_args: any) => ({})) },
    };
    const service = new ReviewsService(prisma as any);
    await service.createReview('u1', { product_id: 'p1', rating: 5, photos: [OK] });
    expect(prisma.review.create.mock.calls[0][0].data.photos).toEqual([OK]);
  });

  it('updateReview rejects 11 photos and other hosts', async () => {
    const prisma = {
      review: { findUnique: vi.fn(async () => ({ id: 'r1', userId: 'u1' })), update: vi.fn() },
    };
    const service = new ReviewsService(prisma as any);
    await expect(
      service.updateReview('u1', 'r1', { photos: Array(11).fill(OK) }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateReview('u1', 'r1', { photos: ['https://evil.example.com/a.png'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.review.update).not.toHaveBeenCalled();
  });

  it('createReturn rejects bad photos before touching the database', async () => {
    const prisma = { order: { findFirst: vi.fn() }, returnRequest: { create: vi.fn() } };
    const service = new ReturnsService(prisma as any);
    await expect(
      service.createReturn('u1', { order_id: 'o1', photos: bad }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.order.findFirst).not.toHaveBeenCalled();
  });

  it('createReturn stores valid photos', async () => {
    const prisma = {
      order: { findFirst: vi.fn(async () => ({ id: 'o1', userId: 'u1', status: 'DELIVERED' })) },
      returnRequest: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async (_args: any) => ({})),
      },
    };
    const service = new ReturnsService(prisma as any);
    await service.createReturn('u1', { order_id: 'o1', photos: [OK, LEGACY] });
    expect(prisma.returnRequest.create.mock.calls[0][0].data.photos).toEqual([OK, LEGACY]);
  });
});
