import { describe, expect, it, vi } from 'vitest';
import * as bcrypt from 'bcryptjs';
import { BadRequestException } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminStaffService } from './admin-staff.service';
import { RateLimitService } from '../common/rate-limit.service';

vi.mock('../common/guards/admin-auth.guard', () => ({
  createAdminSession: vi.fn(() => 'session-token'),
}));

const NINE = 'abcdefghi';
const TEN = 'abcdefghij';

function authSetup() {
  const staff = { id: 's1', phoneNumber: '+998901234567', mustChangePassword: true, passwordHash: null };
  const prisma = {
    staff: {
      findUnique: vi.fn(async () => staff),
      update: vi.fn(async () => staff),
    },
  };
  const service = new AdminAuthService(
    prisma as any,
    new RateLimitService(),
    {} as any,
    {} as any,
    {} as any,
  );
  return { prisma, service };
}

describe('admin password minimum (10)', () => {
  it('setPassword rejects 9 characters and accepts 10', async () => {
    const { prisma, service } = authSetup();
    await expect(service.setPassword('s1', NINE)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.staff.update).not.toHaveBeenCalled();
    await service.setPassword('s1', TEN);
    expect(prisma.staff.update).toHaveBeenCalledTimes(1);
  });

  it('setPassword (change) rejects a 9 character new password after the current one checks out', async () => {
    const { prisma, service } = authSetup();
    const hash = await bcrypt.hash('oldpass', 4);
    prisma.staff.findUnique.mockResolvedValue({
      id: 's1',
      mustChangePassword: false,
      passwordHash: hash,
    } as any);
    await expect(service.setPassword('s1', NINE, 'oldpass')).rejects.toBeInstanceOf(BadRequestException);
    await service.setPassword('s1', TEN, 'oldpass');
    expect(prisma.staff.update).toHaveBeenCalledTimes(1);
  });

  it('reset rejects 9 characters and accepts 10', async () => {
    const { prisma, service } = authSetup();
    const token = 'a'.repeat(64);
    (service as any).resetTokens.set(token, {
      staffId: 's1',
      phone: '+998901234567',
      expiresAt: Date.now() + 60_000,
    });
    await expect(service.resetPasswordWithToken(token, NINE)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.staff.update).not.toHaveBeenCalled();
    await service.resetPasswordWithToken(token, TEN);
    expect(prisma.staff.update).toHaveBeenCalledTimes(1);
  });

  it('login does not enforce the minimum, so an existing short password still works', async () => {
    const { prisma, service } = authSetup();
    const hash = await bcrypt.hash('short', 4);
    prisma.staff.findUnique.mockResolvedValue({
      id: 's1',
      phoneNumber: '+998901234567',
      isActive: true,
      deletedAt: null,
      mustChangePassword: false,
      passwordHash: hash,
      role: 'ADMIN',
      name: 'A',
    } as any);
    (prisma.staff as any).update = vi.fn(async () => ({}));
    const res = await service.login('+998901234567', 'short');
    expect(res.sessionToken).toBeTruthy();
  });

  it('createStaff rejects a 9 character password and accepts 10', async () => {
    const prisma = {
      staff: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: 's2' })),
      },
    };
    const service = new AdminStaffService(prisma as any);
    const data = { phoneNumber: '+998911111111', name: 'N', role: 'MANAGER' };
    await expect(service.createStaff('OWNER', { ...data, password: NINE })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.staff.create).not.toHaveBeenCalled();
    await service.createStaff('OWNER', { ...data, password: TEN });
    expect(prisma.staff.create).toHaveBeenCalledTimes(1);
  });

  it('createStaff without a password is still allowed (set later via OTP)', async () => {
    const prisma = {
      staff: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: 's2' })),
      },
    };
    const service = new AdminStaffService(prisma as any);
    await service.createStaff('OWNER', { phoneNumber: '+998911111111', name: 'N', role: 'MANAGER' });
    expect(prisma.staff.create).toHaveBeenCalledTimes(1);
  });
});
