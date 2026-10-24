import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma } from '@rentevent/db';

function startOfDay(value: Date | string): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Both dates valid and in order, else no period filter at all. */
function parsePeriod(start?: string, end?: string): { start: Date; end: Date } | null {
  if (!start || !end) return null;
  const s = startOfDay(start);
  const e = startOfDay(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) return null;
  return { start: s, end: e };
}

export type ProductSort = 'recommended' | 'newest' | 'popular' | 'price_asc' | 'price_desc';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    page: number;
    limit: number;
    category_id?: string;
    search?: string;
    sort?: ProductSort;
    start_date?: string;
    end_date?: string;
    event_id?: string;
    /** With event_id: only the products recommended for that event. */
    event_featured?: boolean;
  }) {
    const { page, limit, category_id, search, sort, start_date, end_date, event_id, event_featured } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      deletedAt: null,
    };

    if (category_id) {
      where.categoryId = category_id;
    }

    // Optional rental period: drop products with no free unit on at least one
    // day of the range, and report how many units are free for the rest.
    const period = parsePeriod(start_date, end_date);
    let availableById: Map<string, number> | null = null;
    if (period) {
      availableById = await this.availableStockForPeriod(period.start, period.end);
      const soldOut = [...availableById.entries()]
        .filter(([, free]) => free <= 0)
        .map(([id]) => id);
      if (soldOut.length > 0) {
        where.id = { notIn: soldOut };
      }
    }

    if (event_id && event_featured) {
      where.eventPrices = { some: { eventId: event_id, featured: true } };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Pinned products lead every non-price sort; "recommended" then follows
    // the order the admin dragged them into.
    let orderBy: Prisma.ProductOrderByWithRelationInput[];
    switch (sort) {
      case 'price_asc':
        orderBy = [{ dailyPrice: 'asc' }];
        break;
      case 'price_desc':
        orderBy = [{ dailyPrice: 'desc' }];
        break;
      case 'popular':
        orderBy = [{ isPinned: 'desc' }, { orderItems: { _count: 'desc' } }];
        break;
      case 'newest':
        orderBy = [{ isPinned: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'recommended':
      default:
        orderBy = [{ isPinned: 'desc' }, { displayOrder: 'asc' }, { createdAt: 'desc' }];
        break;
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          nameUz: true,
          nameEn: true,
          description: true,
          descriptionUz: true,
          descriptionEn: true,
          photos: true,
          dailyPrice: true,
          totalStock: true,
          isPinned: true,
          createdAt: true,
          // Flat id alongside the nested ref: `IProduct.categoryId` is
          // required, and the storefront filters by it.
          categoryId: true,
          category: {
            select: { id: true, name: true },
          },
          _count: {
            select: { reviews: true, favorites: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const event = event_id ? await this.eventTerms(event_id) : null;

    return {
      items: items.map((p) => ({
        ...p,
        ...(availableById && {
          availableStock: Math.max(0, availableById.get(p.id) ?? p.totalStock),
        }),
        ...(event && this.eventFields(p.id, event)),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * One active event's terms per product (price + pick flag) and how its
   * prices read (per day / whole fair). Empty map for an unknown event.
   */
  private async eventTerms(eventId: string, productIds?: string[]) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, isActive: true },
      select: { priceMode: true },
    });
    if (!event) return { mode: 'DAILY' as const, terms: new Map<string, { price: number | null; featured: boolean }>() };
    const rows = await this.prisma.eventProductPrice.findMany({
      where: { eventId, ...(productIds && { productId: { in: productIds } }) },
      select: { productId: true, price: true, featured: true },
    });
    return {
      mode: event.priceMode,
      terms: new Map(rows.map((r) => [r.productId, { price: r.price, featured: r.featured }])),
    };
  }

  /** The event fields added to a product when the request names an event. */
  private eventFields(
    id: string,
    e: { mode: 'DAILY' | 'FLAT'; terms: Map<string, { price: number | null; featured: boolean }> },
  ) {
    const t = e.terms.get(id);
    return {
      eventPrice: t?.price ?? null,
      eventPriceMode: e.mode,
      eventFeatured: t?.featured ?? false,
    };
  }

  /**
   * Free units per product over [start, end], counting only products that have
   * at least one overlapping reservation — everything else is fully free and
   * simply absent from the map. "Free" is the worst day in the range, the same
   * day-by-day rule checkAvailability applies to a single product.
   */
  private async availableStockForPeriod(start: Date, end: Date): Promise<Map<string, number>> {
    const reservations = await this.prisma.orderItem.findMany({
      where: {
        order: {
          status: { in: ['CONFIRMED', 'PREPARING', 'DELIVERED'] },
          deletedAt: null,
          rentalStartDate: { lte: end },
          rentalEndDate: { gte: start },
        },
      },
      select: {
        productId: true,
        quantity: true,
        order: { select: { rentalStartDate: true, rentalEndDate: true } },
      },
    });

    const result = new Map<string, number>();
    if (reservations.length === 0) return result;

    const productIds = [...new Set(reservations.map((r) => r.productId))];
    const stocks = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, totalStock: true },
    });
    const stockById = new Map(stocks.map((s) => [s.id, s.totalStock]));

    // Peak reserved quantity per product across the days of the range.
    const peakById = new Map<string, number>();
    for (let day = startOfDay(start); day <= end; day.setDate(day.getDate() + 1)) {
      const reservedToday = new Map<string, number>();
      for (const r of reservations) {
        const from = startOfDay(r.order.rentalStartDate);
        const to = startOfDay(r.order.rentalEndDate);
        if (day >= from && day <= to) {
          reservedToday.set(r.productId, (reservedToday.get(r.productId) ?? 0) + r.quantity);
        }
      }
      for (const [id, qty] of reservedToday) {
        if (qty > (peakById.get(id) ?? 0)) peakById.set(id, qty);
      }
    }

    for (const id of productIds) {
      result.set(id, (stockById.get(id) ?? 0) - (peakById.get(id) ?? 0));
    }
    return result;
  }

  async findOne(id: string, eventId?: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, isActive: true, deletedAt: null },
      include: {
        category: {
          select: { id: true, name: true },
        },
        pricingTiers: {
          orderBy: { days: 'asc' },
          select: { id: true, days: true, totalPrice: true },
        },
        quantityPricing: {
          orderBy: { quantity: 'asc' },
          select: { id: true, quantity: true, totalPrice: true },
        },
        _count: {
          select: { reviews: true, favorites: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Compute average rating
    const ratingAgg = await this.prisma.review.aggregate({
      where: { productId: id, isVisible: true },
      _avg: { rating: true },
    });

    const event = eventId ? await this.eventTerms(eventId, [id]) : null;

    return {
      ...product,
      averageRating: ratingAgg._avg.rating ? Number(ratingAgg._avg.rating.toFixed(1)) : null,
      ...(event && this.eventFields(id, event)),
    };
  }

  async checkAvailability(
    id: string,
    startDate: string,
    endDate: string,
    quantity?: number,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id, isActive: true, deletedAt: null },
      select: { id: true, totalStock: true, name: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Find all order items for this product from overlapping CONFIRMED/PREPARING/DELIVERED orders
    const overlappingItems = await this.prisma.orderItem.findMany({
      where: {
        productId: id,
        order: {
          status: { in: ['CONFIRMED', 'PREPARING', 'DELIVERED'] },
          deletedAt: null,
          rentalStartDate: { lte: end },
          rentalEndDate: { gte: start },
        },
      },
      select: {
        quantity: true,
        order: {
          select: {
            rentalStartDate: true,
            rentalEndDate: true,
          },
        },
      },
    });

    // Build day-by-day availability
    const days: { date: string; reserved: number; available: number }[] = [];
    let allAvailable = true;
    const requestedQty = quantity ?? 1;

    for (
      let current = new Date(start);
      current <= end;
      current.setDate(current.getDate() + 1)
    ) {
      const dayStart = new Date(current);
      dayStart.setHours(0, 0, 0, 0);

      let reserved = 0;
      for (const item of overlappingItems) {
        const orderStart = new Date(item.order.rentalStartDate);
        const orderEnd = new Date(item.order.rentalEndDate);
        orderStart.setHours(0, 0, 0, 0);
        orderEnd.setHours(0, 0, 0, 0);

        if (dayStart >= orderStart && dayStart <= orderEnd) {
          reserved += item.quantity;
        }
      }

      const available = product.totalStock - reserved;
      if (available < requestedQty) {
        allAvailable = false;
      }

      days.push({
        date: dayStart.toISOString().split('T')[0],
        reserved,
        available: Math.max(available, 0),
      });
    }

    return {
      productId: product.id,
      productName: product.name,
      totalStock: product.totalStock,
      requestedQuantity: requestedQty,
      available: allAvailable,
      days,
    };
  }

  async getReviews(productId: string, page: number, limit: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true, deletedAt: null },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const skip = (page - 1) * limit;
    const where = { productId, isVisible: true };

    const [reviews, total, ratingAgg] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          rating: true,
          comment: true,
          photos: true,
          createdAt: true,
          user: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.aggregate({
        where,
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      averageRating: ratingAgg._avg.rating ? Number(ratingAgg._avg.rating.toFixed(1)) : null,
      totalReviews: ratingAgg._count.rating,
      items: reviews,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
