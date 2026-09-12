import { describe, it, expect, vi } from 'vitest';
import { ProductsService } from './products.service';
import type { PrismaService } from '../common/prisma.service';

/**
 * Catalog date filtering: products with no free unit on any day of the
 * requested range are excluded, and the rest report free units for the
 * period. Reservations only count from live orders that overlap the range.
 */
function makeService(opts: {
  reservations: { productId: string; quantity: number; start: string; end: string }[];
  stocks: Record<string, number>;
  products: { id: string; totalStock: number }[];
}) {
  const orderItemFindMany = vi.fn().mockResolvedValue(
    opts.reservations.map((r) => ({
      productId: r.productId,
      quantity: r.quantity,
      order: { rentalStartDate: new Date(r.start), rentalEndDate: new Date(r.end) },
    })),
  );
  const productFindMany = vi.fn().mockImplementation(async (args: { where?: { id?: { in?: string[] } } }) => {
    // Stock lookup for reserved products, then the catalog page itself.
    if (args.where?.id?.in) {
      return args.where.id.in.map((id) => ({ id, totalStock: opts.stocks[id] ?? 0 }));
    }
    const excluded: string[] = (args.where?.id as { notIn?: string[] } | undefined)?.notIn ?? [];
    return opts.products.filter((p) => !excluded.includes(p.id));
  });
  const productCount = vi.fn().mockResolvedValue(opts.products.length);

  const prisma = {
    orderItem: { findMany: orderItemFindMany },
    product: { findMany: productFindMany, count: productCount },
  } as unknown as PrismaService;

  return { service: new ProductsService(prisma), orderItemFindMany, productFindMany };
}

const base = { page: 1, limit: 20 };

describe('ProductsService.findAll with a rental period', () => {
  it('excludes products with no free unit on some day of the range and reports free units', async () => {
    const { service, productFindMany } = makeService({
      // "sofa": 2 in stock, both reserved 14–15 Sep → sold out for 13–16.
      // "chair": 10 in stock, 4 reserved 13–13 and 3 reserved 13–14 → peak 7 → 3 free.
      reservations: [
        { productId: 'sofa', quantity: 1, start: '2026-09-14', end: '2026-09-15' },
        { productId: 'sofa', quantity: 1, start: '2026-09-15', end: '2026-09-15' },
        { productId: 'chair', quantity: 4, start: '2026-09-13', end: '2026-09-13' },
        { productId: 'chair', quantity: 3, start: '2026-09-13', end: '2026-09-14' },
      ],
      stocks: { sofa: 2, chair: 10 },
      products: [
        { id: 'sofa', totalStock: 2 },
        { id: 'chair', totalStock: 10 },
        { id: 'table', totalStock: 1 },
      ],
    });

    const result = await service.findAll({ ...base, start_date: '2026-09-13', end_date: '2026-09-16' });

    const listCall = productFindMany.mock.calls.find((c) => !c[0].where?.id?.in)![0];
    expect(listCall.where.id).toEqual({ notIn: ['sofa'] });

    const byId = Object.fromEntries(result.items.map((p: { id: string; availableStock?: number }) => [p.id, p.availableStock]));
    expect(byId).toEqual({ chair: 3, table: 1 });
  });

  it('only looks at live orders overlapping the range', async () => {
    const { service, orderItemFindMany } = makeService({ reservations: [], stocks: {}, products: [] });
    await service.findAll({ ...base, start_date: '2026-09-13', end_date: '2026-09-16' });

    const where = orderItemFindMany.mock.calls[0][0].where.order;
    expect(where.status).toEqual({ in: ['CONFIRMED', 'PREPARING', 'DELIVERED'] });
    expect(where.deletedAt).toBeNull();
    expect(where.rentalStartDate.lte.getDate()).toBe(16);
    expect(where.rentalEndDate.gte.getDate()).toBe(13);
  });

  it('ignores the period when it is missing or inverted', async () => {
    const { service, orderItemFindMany } = makeService({
      reservations: [],
      stocks: {},
      products: [{ id: 'table', totalStock: 1 }],
    });

    const none = await service.findAll(base);
    const inverted = await service.findAll({ ...base, start_date: '2026-09-16', end_date: '2026-09-13' });
    const half = await service.findAll({ ...base, start_date: '2026-09-16' });

    expect(orderItemFindMany).not.toHaveBeenCalled();
    for (const r of [none, inverted, half]) {
      expect((r.items[0] as { availableStock?: number }).availableStock).toBeUndefined();
    }
  });
});
