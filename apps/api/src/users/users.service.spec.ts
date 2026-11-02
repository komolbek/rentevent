import { describe, it, expect, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@rentevent/db';
import { UsersService } from './users.service';
import type { PrismaService } from '../common/prisma.service';

/**
 * DELETE /user/profile anonymizes the account: personal data and sessions
 * go, orders stay for accounting (docs/spec/account-deletion.md).
 */
function makeService(opts: { user?: { id: string; deletedAt: Date | null } | null; openOrders?: number }) {
  // Every call on the transaction client is logged in order, so tests can
  // check that the open-order check runs inside the transaction, before writes.
  const calls: string[] = [];
  const log = <T>(name: string, result: T) =>
    vi.fn().mockImplementation(async () => {
      calls.push(name);
      return result;
    });
  const tx = {
    user: {
      findUnique: log('user.findUnique', opts.user === undefined ? { id: 'u1', deletedAt: null } : opts.user),
      update: log('user.update', {}),
    },
    order: { count: log('order.count', opts.openOrders ?? 0), updateMany: log('order.updateMany', {}) },
    session: { deleteMany: log('session.deleteMany', {}) },
    address: { deleteMany: log('address.deleteMany', {}) },
    favorite: { deleteMany: log('favorite.deleteMany', {}) },
    review: { deleteMany: log('review.deleteMany', {}) },
    notification: { deleteMany: log('notification.deleteMany', {}) },
  };
  const transaction = vi.fn().mockImplementation(async (fn: (t: typeof tx) => unknown) => {
    calls.push('BEGIN');
    const result = await fn(tx);
    calls.push('COMMIT');
    return result;
  });
  // Nothing may be read or written outside the transaction.
  const prisma = { $transaction: transaction } as unknown as PrismaService;
  return { service: new UsersService(prisma), tx, transaction, calls };
}

describe('UsersService.deleteAccount', () => {
  it('checks open orders inside a serializable transaction, then revokes sessions and anonymizes', async () => {
    const { service, tx, transaction, calls } = makeService({});

    await expect(service.deleteAccount('u1')).resolves.toEqual({ success: true });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transaction.mock.calls[0][1]).toEqual({
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(calls).toEqual([
      'BEGIN',
      'user.findUnique',
      'order.count',
      'session.deleteMany',
      'order.updateMany',
      'address.deleteMany',
      'favorite.deleteMany',
      'review.deleteMany',
      'notification.deleteMany',
      'user.update',
      'COMMIT',
    ]);

    expect(tx.order.count.mock.calls[0][0].where).toEqual({
      userId: 'u1',
      deletedAt: null,
      status: { in: ['CONFIRMED', 'PREPARING', 'DELIVERED'] },
    });
    // Only the caller's own rows are touched.
    for (const fn of [tx.session.deleteMany, tx.address.deleteMany, tx.favorite.deleteMany, tx.review.deleteMany, tx.notification.deleteMany]) {
      expect(fn.mock.calls[0][0].where).toEqual({ userId: 'u1' });
    }
    expect(tx.order.updateMany.mock.calls[0][0]).toEqual({
      where: { userId: 'u1', deliveryAddressId: { not: null } },
      data: { deliveryAddressId: null },
    });

    const update = tx.user.update.mock.calls[0][0];
    expect(update.where).toEqual({ id: 'u1' });
    expect(update.data.name).toBeNull();
    expect(update.data.isActive).toBe(false);
    expect(update.data.deletedAt).toBeInstanceOf(Date);
    expect(update.data.phoneNumber).toMatch(/^deleted:u1:[0-9a-f]{12}$/);
  });

  it('refuses while orders are in progress and writes nothing', async () => {
    const { service, calls } = makeService({ openOrders: 1 });

    await expect(service.deleteAccount('u1')).rejects.toBeInstanceOf(ConflictException);
    expect(calls).toEqual(['BEGIN', 'user.findUnique', 'order.count']);
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
