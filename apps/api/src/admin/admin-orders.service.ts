import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma, OrderStatus, CorporateInvoiceStatus } from '@rentevent/db';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  DELIVERED: [OrderStatus.RETURNED],
  RETURNED: [],
  CANCELLED: [],
};

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    page: number;
    limit: number;
    status?: string;
    search?: string;
  }) {
    const { page, limit, status, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      deletedAt: null,
    };

    if (status) {
      where.status = status as OrderStatus;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { phoneNumber: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, phoneNumber: true } },
          items: {
            select: {
              id: true,
              productName: true,
              productPhoto: true,
              quantity: true,
              totalPrice: true,
            },
          },
          deliveryAddress: {
            select: { id: true, fullAddress: true, city: true },
          },
          _count: { select: { returnRequests: true, rentalExtensions: true } },
        },
      }),
      this.prisma.order.count({ where }),
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

  async updateStatus(
    orderId: string,
    newStatus: OrderStatus,
    staffId: string,
    notes?: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const allowedTransitions = VALID_TRANSITIONS[order.status];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${newStatus}. Allowed: ${allowedTransitions?.join(', ') || 'none (terminal state)'}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          updatedBy: staffId,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: newStatus,
          notes,
          createdBy: staffId,
        },
      });

      return updated;
    });
  }

  async updateCorporateInvoiceStatus(
    orderId: string,
    status: CorporateInvoiceStatus,
    staffId: string,
    note?: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentMethod !== 'BANK_TRANSFER') {
      throw new BadRequestException(
        'Corporate invoice status applies only to BANK_TRANSFER orders',
      );
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        corporateInvoiceStatus: status,
        corporateInvoiceNote: note ?? order.corporateInvoiceNote,
        paymentStatus:
          status === 'PAID'
            ? 'PAID'
            : status === 'CANCELLED'
              ? order.paymentStatus
              : order.paymentStatus,
        updatedBy: staffId,
      },
    });
  }
}
