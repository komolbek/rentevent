import { describe, it, expect, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import type { PrismaService } from '../common/prisma.service';

/**
 * POST /orders/quote must price a cart exactly like POST /orders: same
 * validation, same availability check, same numbers, and no writes.
 */
type Product = {
  id: string;
  name: string;
  photos: string[];
  dailyPrice: number;
  totalStock: number;
  minRentalDays: number;
  maxRentalDays: number;
  pricingTiers: { days: number; totalPrice: number }[];
  quantityPricing: { quantity: number; totalPrice: number }[];
};

function product(id: string, over: Partial<Product> = {}): Product {
  return {
    id,
    name: id,
    photos: [],
    dailyPrice: 100_000,
    totalStock: 50,
    minRentalDays: 1,
    maxRentalDays: 30,
    pricingTiers: [],
    quantityPricing: [],
    ...over,
  };
}

function makeService(opts: {
  products: Product[];
  event?: { id: string; priceMode: 'FLAT' | 'DAILY'; prices: Record<string, number | null> };
  reserved?: number;
}) {
  const writes = {
    orderCreate: vi.fn().mockImplementation(async (args: { data: Record<string, unknown> }) => ({
      id: 'order-1',
      ...args.data,
      items: (args.data.items as { create: unknown[] }).create,
    })),
    counterUpsert: vi.fn().mockResolvedValue({ counter: 1 }),
  };
  const client = {
    product: {
      findMany: vi.fn().mockImplementation(async (args: { where: { id: { in: string[] } } }) =>
        opts.products.filter((p) => args.where.id.in.includes(p.id)),
      ),
    },
    event: {
      findFirst: vi.fn().mockImplementation(async () =>
        opts.event
          ? {
              id: opts.event.id,
              priceMode: opts.event.priceMode,
              productPrices: Object.entries(opts.event.prices).map(([productId, price]) => ({
                productId,
                price,
              })),
            }
          : null,
      ),
    },
    orderItem: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { quantity: opts.reserved ?? 0 } }),
    },
    orderCounter: { upsert: writes.counterUpsert },
    address: { findFirst: vi.fn().mockResolvedValue({ id: 'addr-1' }) },
    order: { create: writes.orderCreate },
  };
  const prisma = {
    ...client,
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => unknown) => fn(client)),
  } as unknown as PrismaService;

  return { service: new OrdersService(prisma), writes };
}

function inDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

const placement = {
  delivery_type: 'SELF_PICKUP' as const,
  payment_method: 'CASH',
};

async function quoteAndCreate(
  service: OrdersService,
  cart: {
    items: { product_id: string; quantity: number }[];
    rental_start_date: string;
    rental_end_date: string;
    event_id?: string;
  },
) {
  const quote = await service.quoteOrder(cart);
  const order = (await service.createOrder('user-1', { ...cart, ...placement })) as unknown as {
    subtotal: number;
    totalAmount: number;
    totalSavings: number;
    items: { productId: string; totalPrice: number; savings: number }[];
  };
  return { quote, order };
}

function expectSameNumbers(
  quote: Awaited<ReturnType<OrdersService['quoteOrder']>>,
  order: { subtotal: number; totalAmount: number; totalSavings: number; items: { productId: string; totalPrice: number; savings: number }[] },
) {
  expect(quote.subtotal).toBe(order.subtotal);
  expect(quote.totalAmount).toBe(order.totalAmount);
  expect(quote.totalSavings).toBe(order.totalSavings);
  expect(quote.items.map((i) => [i.productId, i.totalPrice, i.savings])).toEqual(
    order.items.map((i) => [i.productId, i.totalPrice, i.savings]),
  );
}

describe('OrdersService.quoteOrder', () => {
  it('matches the created order for products with day tiers and quantity pricing', async () => {
    const { service } = makeService({
      products: [
        product('sofa', { pricingTiers: [{ days: 3, totalPrice: 250_000 }] }),
        product('chair', { dailyPrice: 20_000, quantityPricing: [{ quantity: 10, totalPrice: 150_000 }] }),
      ],
    });
    const cart = {
      items: [
        { product_id: 'sofa', quantity: 2 },
        { product_id: 'chair', quantity: 12 },
      ],
      rental_start_date: inDays(2),
      rental_end_date: inDays(5), // 4 days, inclusive
    };

    const { quote, order } = await quoteAndCreate(service, cart);

    expectSameNumbers(quote, order);
    expect(quote.rentalDays).toBe(4);
    // sofa: 3-day tier 250 000 × 2; chair: qty tier 150 000 × 4 days, base 20 000 × 4 × 12.
    expect(quote.items[0].totalPrice).toBe(500_000);
    expect(quote.items[1].totalPrice).toBe(600_000);
    expect(quote.items[1].savings).toBe(960_000 - 600_000);
    expect(quote.totalAmount).toBe(1_100_000);
  });

  it('matches the created order for a set expanded into its products', async () => {
    // A set has no price of its own: the cart sends its products as items.
    const { service } = makeService({
      products: [product('table', { dailyPrice: 80_000 }), product('stool', { dailyPrice: 15_000 })],
    });
    const cart = {
      items: [
        { product_id: 'table', quantity: 1 },
        { product_id: 'stool', quantity: 4 },
      ],
      rental_start_date: inDays(1),
      rental_end_date: inDays(1),
    };

    const { quote, order } = await quoteAndCreate(service, cart);

    expectSameNumbers(quote, order);
    expect(quote.totalAmount).toBe(80_000 + 4 * 15_000);
  });

  it('matches the created order for whole-fair (FLAT) event prices', async () => {
    const { service } = makeService({
      products: [product('stand'), product('lamp', { dailyPrice: 10_000 })],
      event: { id: 'fair', priceMode: 'FLAT', prices: { stand: 900_000, lamp: null } },
    });
    const cart = {
      items: [
        { product_id: 'stand', quantity: 2 },
        { product_id: 'lamp', quantity: 3 },
      ],
      rental_start_date: inDays(3),
      rental_end_date: inDays(5),
      event_id: 'fair',
    };

    const { quote, order } = await quoteAndCreate(service, cart);

    expectSameNumbers(quote, order);
    // FLAT covers the whole fair; the lamp row has no price, so normal pricing.
    expect(quote.items[0].totalPrice).toBe(1_800_000);
    expect(quote.items[1].totalPrice).toBe(3 * 10_000 * 3);
  });

  it('matches the created order for DAILY event prices', async () => {
    const { service } = makeService({
      products: [product('stand')],
      event: { id: 'fair', priceMode: 'DAILY', prices: { stand: 70_000 } },
    });
    const cart = {
      items: [{ product_id: 'stand', quantity: 2 }],
      rental_start_date: inDays(3),
      rental_end_date: inDays(4),
      event_id: 'fair',
    };

    const { quote, order } = await quoteAndCreate(service, cart);

    expectSameNumbers(quote, order);
    expect(quote.totalAmount).toBe(70_000 * 2 * 2);
  });

  it('writes nothing', async () => {
    const { service, writes } = makeService({ products: [product('sofa')] });
    await service.quoteOrder({
      items: [{ product_id: 'sofa', quantity: 1 }],
      rental_start_date: inDays(1),
      rental_end_date: inDays(2),
    });
    expect(writes.orderCreate).not.toHaveBeenCalled();
    expect(writes.counterUpsert).not.toHaveBeenCalled();
  });

  it('rejects what order creation rejects: stock, bad quantity, past dates', async () => {
    const { service } = makeService({ products: [product('sofa', { totalStock: 2 })], reserved: 1 });
    const base = { rental_start_date: inDays(1), rental_end_date: inDays(2) };

    await expect(
      service.quoteOrder({ ...base, items: [{ product_id: 'sofa', quantity: 2 }] }),
    ).rejects.toThrow(/Not enough stock/);
    await expect(
      service.quoteOrder({ ...base, items: [{ product_id: 'sofa', quantity: -1 }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.quoteOrder({ ...base, items: [{ product_id: 'sofa', quantity: 1.5 }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.quoteOrder({
        items: [{ product_id: 'sofa', quantity: 1 }],
        rental_start_date: inDays(-2),
        rental_end_date: inDays(1),
      }),
    ).rejects.toThrow(/today or later/);
  });
});
