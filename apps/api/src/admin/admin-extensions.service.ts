import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { ExtensionStatus } from '@rentevent/db';

@Injectable()
export class AdminExtensionsService {
  constructor(private readonly prisma: PrismaService) {}

  async processExtension(
    id: string,
    staffId: string,
    data: { status: ExtensionStatus; notes?: string },
  ) {
    const extension = await this.prisma.rentalExtension.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!extension) {
      throw new NotFoundException('Rental extension not found');
    }

    if (extension.status !== ExtensionStatus.PENDING) {
      throw new BadRequestException(
        `Extension is already ${extension.status.toLowerCase()}, cannot update`,
      );
    }

    if (
      data.status !== ExtensionStatus.APPROVED &&
      data.status !== ExtensionStatus.REJECTED
    ) {
      throw new BadRequestException('Status must be APPROVED or REJECTED');
    }

    if (data.status === ExtensionStatus.APPROVED) {
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.rentalExtension.update({
          where: { id },
          data: {
            status: ExtensionStatus.APPROVED,
            processedBy: staffId,
            notes: data.notes,
          },
          include: {
            order: {
              select: { id: true, orderNumber: true, rentalEndDate: true },
            },
            user: { select: { id: true, name: true } },
          },
        });

        await tx.order.update({
          where: { id: extension.orderId },
          data: {
            rentalEndDate: extension.newEndDate,
            updatedBy: staffId,
          },
        });

        return updated;
      });
    }

    // Rejected
    return this.prisma.rentalExtension.update({
      where: { id },
      data: {
        status: ExtensionStatus.REJECTED,
        processedBy: staffId,
        notes: data.notes,
      },
      include: {
        order: {
          select: { id: true, orderNumber: true, rentalEndDate: true },
        },
        user: { select: { id: true, name: true } },
      },
    });
  }
}
