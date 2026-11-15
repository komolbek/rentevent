import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as crypto from 'crypto';
import { assertAdminPassword } from '../common/password';

@Injectable()
export class AdminStaffService {
  constructor(private prisma: PrismaService) {}

  async listStaff() {
    const staff = await this.prisma.staff.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { staff };
  }

  async createStaff(
    staffRole: string,
    data: {
      phoneNumber: string;
      name: string;
      role: string;
      password?: string;
    },
  ) {
    if (staffRole !== 'OWNER') {
      throw new ForbiddenException('Only OWNER can create staff members');
    }

    if (data.password) assertAdminPassword(data.password);

    const existing = await this.prisma.staff.findUnique({
      where: { phoneNumber: data.phoneNumber },
    });

    if (existing && existing.isActive && !existing.deletedAt) {
      throw new ConflictException('Staff member with this phone number already exists');
    }

    const staffSelect = {
      id: true,
      phoneNumber: true,
      name: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
    } as const;

    if (existing) {
      // Reactivate a soft-deleted or deactivated staff record. Wipe the
      // password so the returning user must re-verify via forgot-password OTP.
      const staff = await this.prisma.staff.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          role: data.role as any,
          isActive: true,
          deletedAt: null,
          passwordHash: null,
          mustChangePassword: true,
        },
        select: staffSelect,
      });
      return { staff };
    }

    const passwordHash = data.password
      ? crypto.createHash('sha256').update(data.password).digest('hex')
      : null;

    const staff = await this.prisma.staff.create({
      data: {
        phoneNumber: data.phoneNumber,
        name: data.name,
        role: data.role as any,
        passwordHash,
        mustChangePassword: !data.password,
      },
      select: staffSelect,
    });

    return { staff };
  }

  async updateStaff(
    staffRole: string,
    id: string,
    data: {
      name?: string;
      role?: string;
      isActive?: boolean;
    },
  ) {
    if (staffRole !== 'OWNER') {
      throw new ForbiddenException('Only OWNER can update staff members');
    }

    const existing = await this.prisma.staff.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Staff member not found');
    }

    const staff = await this.prisma.staff.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.role !== undefined && { role: data.role as any }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      select: {
        id: true,
        phoneNumber: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });

    return { staff };
  }

  async deleteStaff(staffRole: string, staffId: string, targetId: string) {
    if (staffRole !== 'OWNER') {
      throw new ForbiddenException('Only OWNER can deactivate staff members');
    }

    if (staffId === targetId) {
      throw new ForbiddenException('Cannot deactivate your own account');
    }

    const existing = await this.prisma.staff.findUnique({ where: { id: targetId } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Staff member not found');
    }

    await this.prisma.staff.update({
      where: { id: targetId },
      data: { isActive: false, deletedAt: new Date() },
    });

    return { success: true };
  }
}
