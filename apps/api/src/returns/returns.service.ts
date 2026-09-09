import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma } from '@rentevent/db';

interface CreateReturnDto {
  order_id: string;
  reason?: string;
  photos?: string[];
}

interface ListReturnsDto {
  page: number;
  limit: number;
}

@Injectable()
export class ReturnsService {
  constructor(private prisma: PrismaService) {}

  async createReturn(userId: string, dto: CreateReturnDto) {
    if (!dto.order_id) {
      throw new BadRequestException('order_id is required');
    }

    // Verify the order exists and belongs to the user
    const order = await this.prisma.order.findFirst({
      where: { id: dto.order_id, deletedAt: null },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only create returns for your own orders');
    }

    // Only DELIVERED orders can be returned
    if (order.status !== 'DELIVERED') {
      throw new BadRequestException(
        'Return requests can only be created for delivered orders',
      );
    }

    // Prevent duplicate return requests (no active return for this order)
    const existingReturn = await this.prisma.returnRequest.findFirst({
      where: {
        orderId: dto.order_id,
        status: { notIn: ['REJECTED', 'COMPLETED'] },
      },
    });

    if (existingReturn) {
      throw new ConflictException(
        'An active return request already exists for this order',
      );
    }

    const returnRequest = await this.prisma.returnRequest.create({
      data: {
        orderId: dto.order_id,
        userId,
        reason: dto.reason || null,
        photos: dto.photos || [],
        status: 'REQUESTED',
      },
      include: {
        order: {
          include: { items: true },
        },
      },
    });

    return returnRequest;
  }

  async getMyReturns(userId: string, dto: ListReturnsDto) {
    const { page, limit } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.ReturnRequestWhereInput = { userId };

    const [returns, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
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
      this.prisma.returnRequest.count({ where }),
    ]);

    return {
      data: returns,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getReturn(userId: string, returnId: string) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: {
          include: {
            items: { include: { product: true } },
            deliveryAddress: true,
          },
        },
      },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.userId !== userId) {
      throw new ForbiddenException('You can only view your own return requests');
    }

    return returnRequest;
  }
}
