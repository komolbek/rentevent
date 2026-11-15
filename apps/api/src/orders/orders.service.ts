import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma, OrderStatus, PaymentMethod } from '@rentevent/db';
import { priceOrder } from './order-pricing';
import { MAX_RENTAL_DAYS } from '../common/rental-period';

const MAX_ORDER_ITEMS = 100;
const MAX_ITEM_QUANTITY = 10000;

/** The part of an order body that decides availability and price. */
interface CartDto {
  items: { product_id: string; quantity: number }[];
  rental_start_date: string;
  rental_end_date: string;
  /** The fair the order is for: its per-product event prices apply. */
  event_id?: string;
}

export type QuoteOrderDto = CartDto;

interface CreateOrderDto extends CartDto {
  delivery_type: 'DELIVERY' | 'SELF_PICKUP';
  delivery_address_id?: string;
  payment_method: string;
  company_name?: string;
  company_inn?: string;
  notes?: string;
}

interface ListOrdersDto {
  page: number;
  limit: number;
  status?: string;
}

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Prices a cart exactly as createOrder would, without writing anything:
   * same item/date validation, same availability check, same pricing code.
   * Fields that only matter when placing the order (delivery, payment,
   * company) are not needed here and are ignored.
   */
  async quoteOrder(dto: QuoteOrderDto) {
    const { startDate, rentalDays } = this.parseCart(dto);
    const priced = await this.priceCart(this.prisma, dto, startDate, rentalDays);
    return {
      items: priced.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        dailyPrice: i.dailyPrice,
        totalPrice: i.totalPrice,
        savings: i.savings,
      })),
      rentalDays,
      subtotal: priced.subtotal,
      deliveryFee: 0,
      totalAmount: priced.totalAmount,
      totalSavings: priced.totalSavings,
    };
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    // --- Validate inputs ---
    const { startDate, endDate, rentalDays } = this.parseCart(dto);

    if (dto.delivery_type === 'DELIVERY' && !dto.delivery_address_id) {
      throw new BadRequestException(
        'Delivery address is required for delivery orders',
      );
    }

    if (!(Object.values(PaymentMethod) as string[]).includes(dto.payment_method)) {
      throw new BadRequestException('Unknown payment method');
    }

    const isBankTransfer = dto.payment_method === 'BANK_TRANSFER';
    const companyName = isBankTransfer ? dto.company_name?.trim() : undefined;
    const companyInn = isBankTransfer ? dto.company_inn?.trim() : undefined;
    if (isBankTransfer) {
      if (!companyName) {
        throw new BadRequestException(
          'Company name is required for bank transfer payment',
        );
      }
      if (!companyInn || !/^\d{9}$/.test(companyInn)) {
        throw new BadRequestException('INN must be 9 digits');
      }
    }

    // --- Execute in SERIALIZABLE transaction ---
    return this.prisma.$transaction(
      async (tx) => {
        const { subtotal, totalAmount, totalSavings, items: orderItemsData, eventId } =
          await this.priceCart(tx, dto, startDate, rentalDays);

        // Generate order number: RE-YYYYMMDD-NNN
        const dateStr = new Date()
          .toISOString()
          .split('T')[0]
          .replace(/-/g, '');
        const counterKey = `orders-${dateStr}`;

        const counter = await tx.orderCounter.upsert({
          where: { id: counterKey },
          create: { id: counterKey, counter: 1 },
          update: { counter: { increment: 1 } },
        });

        const orderNumber = `RE-${dateStr}-${String(counter.counter).padStart(3, '0')}`;

        // Validate delivery address belongs to user
        if (dto.delivery_address_id) {
          const address = await tx.address.findFirst({
            where: { id: dto.delivery_address_id, userId },
          });
          if (!address) {
            throw new BadRequestException('Delivery address not found');
          }
        }

        // Create order
        const order = await tx.order.create({
          data: {
            orderNumber,
            userId,
            status: 'CONFIRMED',
            deliveryType: dto.delivery_type,
            deliveryAddressId: dto.delivery_address_id || null,
            deliveryFee: 0,
            subtotal,
            totalAmount,
            totalSavings,
            rentalStartDate: startDate,
            rentalEndDate: endDate,
            paymentMethod: dto.payment_method as any,
            companyName: companyName || null,
            companyInn: companyInn || null,
            corporateInvoiceStatus: isBankTransfer ? 'PENDING' : null,
            eventId,
            notes: dto.notes || null,
            items: {
              create: orderItemsData,
            },
            statusHistory: {
              create: {
                status: 'CONFIRMED',
                notes: 'Order created',
              },
            },
          },
          include: {
            items: true,
            deliveryAddress: true,
          },
        });

        return order;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  /** Validates the items and the rental period shared by create and quote. */
  private parseCart(dto: CartDto) {
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }
    if (dto.items.length > MAX_ORDER_ITEMS) {
      throw new BadRequestException(`An order can have at most ${MAX_ORDER_ITEMS} items`);
    }
    for (const item of dto.items) {
      if (!item || typeof item.product_id !== 'string' || !item.product_id) {
        throw new BadRequestException('Each item needs a product_id');
      }
      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > MAX_ITEM_QUANTITY
      ) {
        throw new BadRequestException(
          `Quantity must be a whole number from 1 to ${MAX_ITEM_QUANTITY}`,
        );
      }
    }

    const startDate = new Date(dto.rental_start_date);
    const endDate = new Date(dto.rental_end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format');
    }

    const startDay = new Date(startDate);
    startDay.setHours(0, 0, 0, 0);

    if (startDay < today) {
      throw new BadRequestException('Rental start date must be today or later');
    }

    // Rental dates are whole days and both ends are included — the way the
    // storefront counts them — so a one-day rental has start == end.
    if (endDate < startDate) {
      throw new BadRequestException('Rental end date must not be before start date');
    }

    const rentalDays =
      Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    // Bounds the per-day stock check (items × days queries).
    if (rentalDays > MAX_RENTAL_DAYS) {
      throw new BadRequestException(`Rental period can be at most ${MAX_RENTAL_DAYS} days`);
    }

    return { startDate, endDate, rentalDays };
  }

  /**
   * Loads products and the event, checks rental limits and stock for every
   * day, then prices the cart. Read-only: createOrder runs it inside its
   * transaction, quoteOrder on the plain client.
   */
  private async priceCart(
    db: Prisma.TransactionClient,
    dto: CartDto,
    startDate: Date,
    rentalDays: number,
  ) {
    const productIds = dto.items.map((i) => i.product_id);
    const products = await db.product.findMany({
      where: { id: { in: productIds }, isActive: true, deletedAt: null },
      include: { pricingTiers: true, quantityPricing: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException(
        'One or more products not found or inactive',
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    const event = dto.event_id
      ? await db.event.findFirst({
          where: { id: dto.event_id, isActive: true },
          include: { productPrices: { where: { productId: { in: productIds } } } },
        })
      : null;
    if (dto.event_id && !event) {
      throw new BadRequestException('Event not found');
    }
    // Only rows with a price — a row may just mark a product as recommended.
    const eventPrices = new Map(
      (event?.productPrices ?? [])
        .filter((ep) => ep.price != null)
        .map((ep) => [ep.productId, ep.price as number]),
    );

    // Check availability for each day in rental period
    for (const item of dto.items) {
      const product = productMap.get(item.product_id)!;

      if (rentalDays < product.minRentalDays) {
        throw new BadRequestException(
          `Minimum rental period for "${product.name}" is ${product.minRentalDays} day(s)`,
        );
      }
      if (rentalDays > product.maxRentalDays) {
        throw new BadRequestException(
          `Maximum rental period for "${product.name}" is ${product.maxRentalDays} day(s)`,
        );
      }

      // Check stock for each day in the rental window
      for (let d = 0; d < rentalDays; d++) {
        const checkDate = new Date(startDate);
        checkDate.setDate(checkDate.getDate() + d);

        const dayStart = new Date(checkDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(checkDate);
        dayEnd.setHours(23, 59, 59, 999);

        const reservedResult = await db.orderItem.aggregate({
          where: {
            productId: product.id,
            order: {
              status: { notIn: ['CANCELLED', 'RETURNED'] },
              rentalStartDate: { lte: dayEnd },
              // Inclusive end: an order ending today still holds its units today.
              rentalEndDate: { gte: dayStart },
            },
          },
          _sum: { quantity: true },
        });

        const reserved = reservedResult._sum.quantity || 0;
        const available = product.totalStock - reserved;

        if (item.quantity > available) {
          throw new BadRequestException(
            `Not enough stock for "${product.name}" on ${dayStart.toISOString().split('T')[0]}. Available: ${available}, requested: ${item.quantity}`,
          );
        }
      }
    }

    const priced = priceOrder({
      items: dto.items,
      products: productMap,
      rentalDays,
      eventPrices,
      flat: event?.priceMode === 'FLAT',
    });

    return { ...priced, eventId: event?.id ?? null };
  }

  async getMyOrders(
    userId: string,
    dto: ListOrdersDto,
  ) {
    const { page, limit, status } = dto;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      userId,
      deletedAt: null,
    };

    if (status) {
      const upperStatus = status.toUpperCase();
      if (!Object.values(OrderStatus).includes(upperStatus as OrderStatus)) {
        throw new BadRequestException(`Invalid status: ${status}`);
      }
      where.status = upperStatus as OrderStatus;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          deliveryAddress: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    // Use { items, meta } to match PaginatedResponse<T> from @rentevent/types —
    // same envelope as /products, so the web client and mobile client share it.
    return {
      items: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      include: {
        items: { include: { product: true } },
        deliveryAddress: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only view your own orders');
    }

    return order;
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    if (order.status === 'CANCELLED') {
      throw new BadRequestException('Order is already cancelled');
    }

    if (order.status !== 'CONFIRMED' && order.status !== 'PREPARING') {
      throw new BadRequestException(
        'Order can only be cancelled before delivery',
      );
    }

    // Calculate cancellation fee
    const now = new Date();
    const rentalStart = new Date(order.rentalStartDate);
    const hoursUntilStart =
      (rentalStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    let cancellationFeePercent = 0;
    let cancellationNote: string;

    if (hoursUntilStart >= 48) {
      cancellationFeePercent = 0;
      cancellationNote = 'Cancelled 48+ hours before rental start - no fee';
    } else if (hoursUntilStart > 0) {
      // Less than 48 hours but not same day
      const startDay = new Date(rentalStart);
      startDay.setHours(0, 0, 0, 0);
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      if (startDay.getTime() === todayStart.getTime()) {
        cancellationFeePercent = 50;
        cancellationNote =
          'Cancelled on rental start day - 50% cancellation fee';
      } else {
        cancellationFeePercent = 30;
        cancellationNote =
          'Cancelled less than 48 hours before rental start - 30% cancellation fee';
      }
    } else {
      cancellationFeePercent = 50;
      cancellationNote =
        'Cancelled on or after rental start day - 50% cancellation fee';
    }

    const cancellationFee = Math.round(
      (order.totalAmount * cancellationFeePercent) / 100,
    );

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        adminNotes: cancellationNote,
        statusHistory: {
          create: {
            status: 'CANCELLED',
            notes: `${cancellationNote}. Fee: ${cancellationFee}`,
          },
        },
      },
      include: {
        items: true,
        deliveryAddress: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
      },
    });

    return {
      ...updatedOrder,
      cancellation_fee: cancellationFee,
      cancellation_fee_percent: cancellationFeePercent,
    };
  }
}
