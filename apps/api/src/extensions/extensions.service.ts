import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma } from '@rentevent/db';

interface CreateExtensionDto {
  order_id: string;
  additional_days: number;
  notes?: string;
}

interface ListExtensionsDto {
  page: number;
  limit: number;
}

@Injectable()
export class ExtensionsService {
  constructor(private prisma: PrismaService) {}

  async createExtension(userId: string, dto: CreateExtensionDto) {
    if (!dto.order_id) {
      throw new BadRequestException('order_id is required');
    }

    if (!dto.additional_days || dto.additional_days < 1) {
      throw new BadRequestException('additional_days must be at least 1');
    }

    // Verify the order exists and belongs to the user
    const order = await this.prisma.order.findFirst({
      where: { id: dto.order_id, deletedAt: null },
      include: {
        items: {
          include: {
            product: { include: { pricingTiers: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only extend your own orders');
    }

    // Only active (CONFIRMED or DELIVERED) orders can be extended
    if (order.status !== 'CONFIRMED' && order.status !== 'DELIVERED') {
      throw new BadRequestException(
        'Only confirmed or delivered orders can be extended',
      );
    }

    // Check that the extension would not exceed max rental days for any product
    const currentDays = Math.ceil(
      (order.rentalEndDate.getTime() - order.rentalStartDate.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const newTotalDays = currentDays + dto.additional_days;

    for (const item of order.items) {
      if (newTotalDays > item.product.maxRentalDays) {
        throw new BadRequestException(
          `Extension would exceed maximum rental period of ${item.product.maxRentalDays} days for "${item.productName}"`,
        );
      }
    }

    // Calculate additional cost from pricing tiers
    let additionalCost = 0;

    for (const item of order.items) {
      const product = item.product;
      const tiers = product.pricingTiers;

      // Find best matching tier for the new total duration
      const newTier = tiers
        .filter((t) => t.days <= newTotalDays)
        .sort((a, b) => b.days - a.days)[0];

      // Find the tier that was used for the original duration
      const originalTier = tiers
        .filter((t) => t.days <= currentDays)
        .sort((a, b) => b.days - a.days)[0];

      const newTotalPrice = newTier
        ? newTier.totalPrice * item.quantity
        : product.dailyPrice * newTotalDays * item.quantity;

      const originalTotalPrice = originalTier
        ? originalTier.totalPrice * item.quantity
        : product.dailyPrice * currentDays * item.quantity;

      additionalCost += newTotalPrice - originalTotalPrice;
    }

    // Ensure cost is non-negative
    if (additionalCost < 0) {
      additionalCost = 0;
    }

    const originalEndDate = new Date(order.rentalEndDate);
    const newEndDate = new Date(originalEndDate);
    newEndDate.setDate(newEndDate.getDate() + dto.additional_days);

    const extension = await this.prisma.rentalExtension.create({
      data: {
        orderId: dto.order_id,
        userId,
        originalEndDate,
        newEndDate,
        additionalDays: dto.additional_days,
        additionalCost,
        status: 'PENDING',
        notes: dto.notes || null,
      },
      include: {
        order: {
          include: { items: true },
        },
      },
    });

    return extension;
  }

  async getMyExtensions(userId: string, dto: ListExtensionsDto) {
    const { page, limit } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.RentalExtensionWhereInput = { userId };

    const [extensions, total] = await Promise.all([
      this.prisma.rentalExtension.findMany({
        where,
        include: {
          order: {
            include: { items: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.rentalExtension.count({ where }),
    ]);

    return {
      data: extensions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
