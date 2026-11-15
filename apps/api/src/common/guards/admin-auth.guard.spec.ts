import { beforeAll, describe, expect, it } from 'vitest';
import { AdminAuthGuard, createAdminSession, validateAdminSession } from './admin-auth.guard';

describe('AdminAuthGuard Origin check', () => {
  const prisma = {
    staff: {
      findUnique: async () => ({ id: 'staff-1', role: 'ADMIN', name: 'A', isActive: true, mustChangePassword: false }),
    },
  };
  const run = (origin?: string) => {
    process.env.ADMIN_SESSION_SECRET = 'test-secret';
    const request: any = {
      url: '/api/admin/x',
      cookies: { admin_session: createAdminSession('staff-1') },
      headers: origin ? { origin } : {},
    };
    const ctx: any = { switchToHttp: () => ({ getRequest: () => request }) };
    return new AdminAuthGuard(prisma as any).canActivate(ctx);
  };

  it('rejects a storefront Origin with 403', async () => {
    await expect(run('https://rentevent.uz')).rejects.toMatchObject({ status: 403 });
  });

  it('allows the admin Origin', async () => {
    await expect(run('https://admin.rentevent.uz')).resolves.toBe(true);
  });

  it('allows requests without Origin', async () => {
    await expect(run()).resolves.toBe(true);
  });
});

describe('validateAdminSession', () => {
  beforeAll(() => {
    process.env.ADMIN_SESSION_SECRET = 'test-secret';
  });

  it('accepts a session it issued', () => {
    const token = createAdminSession('staff-1');
    expect(validateAdminSession(token)).toEqual({ valid: true, staffId: 'staff-1' });
  });

  it('rejects a correct-length forged signature', () => {
    const token = `staff:staff-1:${Date.now()}:${'a'.repeat(64)}`;
    expect(validateAdminSession(token)).toEqual({ valid: false });
  });

  it('rejects a wrong-length signature instead of throwing', () => {
    const token = `staff:staff-1:${Date.now()}:deadbeef`;
    expect(() => validateAdminSession(token)).not.toThrow();
    expect(validateAdminSession(token)).toEqual({ valid: false });
  });

  it('rejects a tampered payload signed for a different staff id', () => {
    const [prefix, , timestamp, signature] = createAdminSession('staff-1').split(':');
    const token = `${prefix}:staff-2:${timestamp}:${signature}`;
    expect(validateAdminSession(token)).toEqual({ valid: false });
  });

  it('rejects an expired session', () => {
    const stale = Date.now() - 25 * 60 * 60 * 1000;
    const token = `staff:staff-1:${stale}:${'a'.repeat(64)}`;
    expect(validateAdminSession(token)).toEqual({ valid: false });
  });

  it('rejects malformed tokens', () => {
    expect(validateAdminSession('')).toEqual({ valid: false });
    expect(validateAdminSession('not:enough:parts')).toEqual({ valid: false });
    expect(validateAdminSession('user:staff-1:123:sig')).toEqual({ valid: false });
  });
});
