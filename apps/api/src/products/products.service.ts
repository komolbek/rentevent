import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma } from '@rentevent/db';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    page: number;
    limit: number;
    category_id?: string;
    search?: string;
    sort?: 'newest' | 'popular' | 'price_asc' | 'price_desc';
  }) {
    const { page, limit, category_id, search, sort } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      deletedAt: null,
    };

    if (category_id) {
      where.categoryId = category_id;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput;
    switch (sort) {
      case 'price_asc':
        orderBy = { dailyPrice: 'asc' };
        break;
      case 'price_desc':
        orderBy = { dailyPrice: 'desc' };
        break;
      case 'popular':
        orderBy = { orderItems: { _count: 'desc' } };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
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
          createdAt: true,
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

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
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

    return {
      ...product,
      averageRating: ratingAgg._avg.rating ? Number(ratingAgg._avg.rating.toFixed(1)) : null,
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
