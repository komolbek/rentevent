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
              productId: true,
              productName: true,
              productPhoto: true,
              quantity: true,
              dailyPrice: true,
              totalPrice: true,
            },
          },
          deliveryAddress: {
            select: { id: true, fullAddress: true, city: true },
          },
          event: { select: { id: true, title: true } },
          _count: { select: { returnRequests: true, rentalExtensions: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: items.map((o) => this.toRow(o)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * The admin orders page reads snake_case (order_number, total_amount,
   * user.phone_number, items[].daily_price …) — the raw camelCase row left
   * every one of those blank. The camelCase fields stay alongside, because
   * the corporate-invoice panel reads paymentMethod / companyName / … .
   */
  private toRow(o: any) {
    const items = (o.items ?? []).map((it: any) => ({
      id: it.id,
      product_id: it.productId,
      product_name: it.productName,
      product_photo: it.productPhoto ?? null,
      quantity: it.quantity,
      daily_price: it.dailyPrice,
      total_price: it.totalPrice,
    }));
    const address = o.deliveryAddress
      ? [o.deliveryAddress.city, o.deliveryAddress.fullAddress].filter(Boolean).join(', ')
      : null;
    return {
      ...o,
      order_number: o.orderNumber,
      status: o.status,
      user: o.user
        ? { id: o.user.id, name: o.user.name ?? null, phone_number: o.user.phoneNumber }
        : null,
      items,
      items_count: items.length,
      total_quantity: items.reduce((n: number, it: { quantity: number }) => n + it.quantity, 0),
      subtotal: o.subtotal,
      total_amount: o.totalAmount,
      delivery_fee: o.deliveryFee,
      delivery_type: o.deliveryType,
      delivery_address: address,
      rental_start_date: o.rentalStartDate,
      rental_end_date: o.rentalEndDate,
      payment_method: o.paymentMethod,
      payment_status: o.paymentStatus,
      notes: o.notes ?? null,
      event: o.event ?? null,
      created_at: o.createdAt,
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
