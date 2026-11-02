import { describe, it, expect, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import type { PrismaService } from '../common/prisma.service';

/**
 * DELETE /user/profile anonymizes the account: personal data and sessions
 * go, orders stay for accounting (docs/spec/account-deletion.md).
 */
function makeService(opts: { user?: { id: string; deletedAt: Date | null } | null; openOrders?: number }) {
  const ops = {
    sessionDelete: vi.fn().mockReturnValue('sessions'),
    orderDetach: vi.fn().mockReturnValue('orders'),
    addressDelete: vi.fn().mockReturnValue('addresses'),
    favoriteDelete: vi.fn().mockReturnValue('favorites'),
    reviewDelete: vi.fn().mockReturnValue('reviews'),
    notificationDelete: vi.fn().mockReturnValue('notifications'),
    userUpdate: vi.fn().mockReturnValue('user'),
    orderCount: vi.fn().mockResolvedValue(opts.openOrders ?? 0),
    transaction: vi.fn().mockResolvedValue([]),
  };
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue(opts.user === undefined ? { id: 'u1', deletedAt: null } : opts.user),
      update: ops.userUpdate,
    },
    order: { count: ops.orderCount, updateMany: ops.orderDetach },
    session: { deleteMany: ops.sessionDelete },
    address: { deleteMany: ops.addressDelete },
    favorite: { deleteMany: ops.favoriteDelete },
    review: { deleteMany: ops.reviewDelete },
    notification: { deleteMany: ops.notificationDelete },
    $transaction: ops.transaction,
  } as unknown as PrismaService;
  return { service: new UsersService(prisma), ops };
}

describe('UsersService.deleteAccount', () => {
  it('revokes sessions, removes personal data and anonymizes the user in one transaction', async () => {
    const { service, ops } = makeService({});

    await expect(service.deleteAccount('u1')).resolves.toEqual({ success: true });

    expect(ops.transaction).toHaveBeenCalledTimes(1);
    expect(ops.transaction.mock.calls[0][0]).toEqual([
      'sessions',
      'orders',
      'addresses',
      'favorites',
      'reviews',
      'notifications',
      'user',
    ]);
    // Only the caller's own rows are touched.
    for (const fn of [ops.sessionDelete, ops.addressDelete, ops.favoriteDelete, ops.reviewDelete, ops.notificationDelete]) {
      expect(fn.mock.calls[0][0].where).toEqual({ userId: 'u1' });
    }
    expect(ops.orderDetach.mock.calls[0][0]).toEqual({
      where: { userId: 'u1', deliveryAddressId: { not: null } },
      data: { deliveryAddressId: null },
    });

    const update = ops.userUpdate.mock.calls[0][0];
    expect(update.where).toEqual({ id: 'u1' });
    expect(update.data.name).toBeNull();
    expect(update.data.isActive).toBe(false);
    expect(update.data.deletedAt).toBeInstanceOf(Date);
    expect(update.data.phoneNumber).toMatch(/^deleted:u1:[0-9a-f]{12}$/);
  });

  it('refuses while orders are in progress', async () => {
    const { service, ops } = makeService({ openOrders: 1 });

    await expect(service.deleteAccount('u1')).rejects.toBeInstanceOf(ConflictException);
    expect(ops.orderCount.mock.calls[0][0].where).toEqual({
      userId: 'u1',
      deletedAt: null,
      status: { in: ['CONFIRMED', 'PREPARING', 'DELIVERED'] },
    });
    expect(ops.transaction).not.toHaveBeenCalled();
  });

  it('returns 404 for a missing or already deleted account', async () => {
    await expect(makeService({ user: null }).service.deleteAccount('u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      makeService({ user: { id: 'u1', deletedAt: new Date() } }).service.deleteAccount('u1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
