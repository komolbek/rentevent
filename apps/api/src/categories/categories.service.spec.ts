import { describe, it, expect, vi } from 'vitest';
import { CategoriesService } from './categories.service';
import type { PrismaService } from '../common/prisma.service';

/**
 * Contract with the storefront's shared `ICategory`: the public list must
 * carry `_count.products`, `parentCategoryId` and `isActive` — for months it
 * sent `productCount` only, so product counts never rendered and the
 * `parentCategoryId` filter was a no-op. `productCount` is kept for the iOS
 * app, which decodes it.
 */
describe('CategoriesService.findActiveWithChildren', () => {
  it('returns the ICategory shape for roots and children', async () => {
    const row = (id: string, parent: string | null, products: number) => ({
      id,
      name: id,
      imageUrl: null,
      iconName: 'chair',
      parentCategoryId: parent,
      displayOrder: 1,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      _count: { products },
    });
    const findMany = vi
      .fn()
      .mockResolvedValue([{ ...row('furniture', null, 12), children: [row('chairs', 'furniture', 5)] }]);
    const prisma = { category: { findMany } } as unknown as PrismaService;

    const result = await new CategoriesService(prisma).findActiveWithChildren();

    expect(result).toEqual([
      expect.objectContaining({
        id: 'furniture',
        parentCategoryId: null,
        isActive: true,
        _count: { products: 12 },
        productCount: 12,
        children: [
          expect.objectContaining({
            id: 'chairs',
            parentCategoryId: 'furniture',
            isActive: true,
            _count: { products: 5 },
            productCount: 5,
          }),
        ],
      }),
    ]);

    // Only active root categories, counting only active products.
    const args = findMany.mock.calls[0][0];
    expect(args.where).toEqual({ isActive: true, parentCategoryId: null });
    expect(args.include._count.select.products).toEqual({ where: { isActive: true } });
  });
});
