import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, HttpException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RateLimitService } from '../common/rate-limit.service';

const CANON = '+998901234567';

function setup(existingUsers: any[] = []) {
  const users = [...existingUsers];
  const prisma = {
    user: {
      findMany: vi.fn(async ({ where }: any) =>
        users.filter((u) => where.phoneNumber.in.includes(u.phoneNumber)),
      ),
      create: vi.fn(async ({ data }: any) => {
        const u = { id: `u${users.length + 1}`, name: null, createdAt: new Date(), ...data };
        users.push(u);
        return u;
      }),
    },
  };
  const otp = {
    generate: vi.fn(async () => '123456'),
    verify: vi.fn(async () => ({ valid: true })),
  };
  const session = { create: vi.fn(async () => 'token') };
  const sms = { sendOTP: vi.fn(async () => ({ success: true })) };
  const rateLimit = new RateLimitService();
  const service = new AuthService(
    prisma as any,
    otp as any,
    session as any,
    sms as any,
    rateLimit,
  );
  return { prisma, otp, sms, service, users, rateLimit };
}

describe('AuthService phone normalization', () => {
  it('rejects an invalid phone with 400 before anything is stored or sent', async () => {
    const { service, otp, sms } = setup();
    await expect(service.sendOtp('12345', '1.1.1.1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.sendOtp(undefined, '1.1.1.1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.verifyOtp('abc', '123456', 'd')).rejects.toBeInstanceOf(BadRequestException);
    expect(otp.generate).not.toHaveBeenCalled();
    expect(sms.sendOTP).not.toHaveBeenCalled();
  });

  it('three spellings share one rate-limit key and one OTP phone', async () => {
    const { service, otp } = setup();
    const spellings = ['+998 90 123 45 67', '998901234567', '+998-90-123-45-67'];
    for (const s of spellings) await service.sendOtp(s, '1.1.1.1');
    expect(otp.generate.mock.calls.map((c: any[]) => c[0])).toEqual([CANON, CANON, CANON]);
    // the 3-per-window phone limit is now spent for every spelling
    await expect(service.sendOtp('+998901234567', '2.2.2.2')).rejects.toBeInstanceOf(HttpException);
    await expect(service.sendOtp('998 90 123 45 67', '3.3.3.3')).rejects.toMatchObject({ status: 429 });
  });

  it('three spellings resolve to one user, stored canonical', async () => {
    const { service, users } = setup();
    const ids = new Set<string>();
    for (const s of ['+998 90 123 45 67', '998901234567', '+998901234567']) {
      const r = await service.verifyOtp(s, '123456', 'dev');
      ids.add(r.user.id);
    }
    expect(ids.size).toBe(1);
    expect(users).toHaveLength(1);
    expect(users[0].phoneNumber).toBe(CANON);
  });

  it('finds a legacy user stored without the plus and creates no duplicate', async () => {
    const { service, users } = setup([{ id: 'legacy', phoneNumber: '998901234567', createdAt: new Date() }]);
    const r = await service.verifyOtp('+998901234567', '123456', 'dev');
    expect(r.user.id).toBe('legacy');
    expect(users).toHaveLength(1);
  });

  it('prefers the canonical row when both spellings exist', async () => {
    const { service } = setup([
      { id: 'legacy', phoneNumber: '998901234567', createdAt: new Date() },
      { id: 'canon', phoneNumber: CANON, createdAt: new Date() },
    ]);
    const r = await service.verifyOtp('998901234567', '123456', 'dev');
    expect(r.user.id).toBe('canon');
  });
});

describe('AuthController client IP', () => {
  it('uses the proxy-appended X-Forwarded-For entry, not a forged first one', async () => {
    const authService = { sendOtp: vi.fn(async () => ({ success: true })) };
    const controller = new AuthController(authService as any);
    const req = (xff: string) => ({ headers: { 'x-forwarded-for': xff }, ip: '10.0.0.1' }) as any;
    await controller.sendOtp({ phone_number: CANON }, req('6.6.6.6, 9.9.9.9'));
    await controller.sendOtp({ phone_number: CANON }, req('7.7.7.7, 9.9.9.9'));
    expect(authService.sendOtp.mock.calls.map((c: any[]) => c[1])).toEqual(['9.9.9.9', '9.9.9.9']);
  });
});
