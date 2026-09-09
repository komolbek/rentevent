import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma, ReturnStatus, DamageLevel } from '@rentevent/db';

@Injectable()
export class AdminReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    page: number;
    limit: number;
    status?: string;
  }) {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ReturnRequestWhereInput = {};

    if (status) {
      where.status = status as ReturnStatus;
    }

    const [items, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              rentalStartDate: true,
              rentalEndDate: true,
            },
          },
          user: { select: { id: true, name: true, phoneNumber: true } },
        },
      }),
      this.prisma.returnRequest.count({ where }),
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

  async update(
    id: string,
    staffId: string,
    data: {
      status?: ReturnStatus;
      damageLevel?: DamageLevel;
      damageNotes?: string;
      damageFee?: number;
      refundAmount?: number;
      pickupDate?: string;
      inspectionNotes?: string;
    },
  ) {
    const existing = await this.prisma.returnRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Return request not found');
    }

    const updateData: Prisma.ReturnRequestUpdateInput = {
      processedBy: staffId,
    };

    if (data.status !== undefined) updateData.status = data.status;
    if (data.damageLevel !== undefined) updateData.damageLevel = data.damageLevel;
    if (data.damageNotes !== undefined) updateData.damageNotes = data.damageNotes;
    if (data.damageFee !== undefined) updateData.damageFee = data.damageFee;
    if (data.refundAmount !== undefined) updateData.refundAmount = data.refundAmount;
    if (data.pickupDate !== undefined) updateData.pickupDate = new Date(data.pickupDate);
    if (data.inspectionNotes !== undefined) updateData.inspectionNotes = data.inspectionNotes;

    return this.prisma.returnRequest.update({
      where: { id },
      data: updateData,
      include: {
        order: {
          select: { id: true, orderNumber: true, totalAmount: true },
        },
        user: { select: { id: true, name: true, phoneNumber: true } },
      },
    });
  }
}
