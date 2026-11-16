import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, HttpException } from '@nestjs/common';
import { AuthService, VERIFY_LIMITS } from './auth.service';
import { AuthController } from './auth.controller';
import { RateLimitService } from '../common/rate-limit.service';
import { SmsQuotaService } from './sms-quota.service';

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
    isTestPhone: vi.fn(() => false),
    issueAndSend: vi.fn(async (_purpose: string, _phone: string, send: (code: string) => Promise<any>) => send('123456')),
    verify: vi.fn(async () => ({ valid: true })),
  };
  const session = { create: vi.fn(async () => 'token') };
  const sms = { sendOTP: vi.fn(async () => ({ success: true })), isCircuitOpen: vi.fn(() => false) };
  const rateLimit = new RateLimitService();
  const service = new AuthService(
    prisma as any,
    otp as any,
    session as any,
    sms as any,
    rateLimit,
    new SmsQuotaService(rateLimit),
  );
  return { prisma, otp, sms, service, users, rateLimit };
}

describe('AuthService phone normalization', () => {
  it('rejects an invalid phone with 400 before anything is stored or sent', async () => {
    const { service, otp, sms } = setup();
    await expect(service.sendOtp('12345', '1.1.1.1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.sendOtp(undefined, '1.1.1.1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.verifyOtp('abc', '123456', 'd', '1.1.1.1')).rejects.toBeInstanceOf(BadRequestException);
    expect(otp.issueAndSend).not.toHaveBeenCalled();
    expect(sms.sendOTP).not.toHaveBeenCalled();
  });

  it('three spellings share one rate-limit key and one OTP phone', async () => {
    vi.useFakeTimers();
    try {
      const { service, otp } = setup();
      const spellings = ['+998 90 123 45 67', '998901234567', '+998-90-123-45-67'];
      await service.sendOtp(spellings[0], '1.1.1.1');
      // the 60 s cooldown is spent for every spelling, whatever the IP
      await expect(service.sendOtp(spellings[1], '2.2.2.2')).rejects.toMatchObject({ status: 429 });
      await expect(service.sendOtp(spellings[2], '3.3.3.3')).rejects.toMatchObject({ status: 429 });
      for (const s of spellings.slice(1)) {
        vi.advanceTimersByTime(61_000);
        await service.sendOtp(s, '1.1.1.1');
      }
      expect(otp.issueAndSend.mock.calls.map((c: any[]) => c[1])).toEqual([CANON, CANON, CANON]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('three spellings resolve to one user, stored canonical', async () => {
    const { service, users } = setup();
    const ids = new Set<string>();
    for (const s of ['+998 90 123 45 67', '998901234567', '+998901234567']) {
      const r = await service.verifyOtp(s, '123456', 'dev', '1.1.1.1');
      ids.add(r.user.id);
    }
    expect(ids.size).toBe(1);
    expect(users).toHaveLength(1);
    expect(users[0].phoneNumber).toBe(CANON);
  });

  it('finds a legacy user stored without the plus and creates no duplicate', async () => {
    const { service, users } = setup([{ id: 'legacy', phoneNumber: '998901234567', createdAt: new Date() }]);
    const r = await service.verifyOtp('+998901234567', '123456', 'dev', '1.1.1.1');
    expect(r.user.id).toBe('legacy');
    expect(users).toHaveLength(1);
  });

  it('prefers the canonical row when both spellings exist', async () => {
    const { service } = setup([
      { id: 'legacy', phoneNumber: '998901234567', createdAt: new Date() },
      { id: 'canon', phoneNumber: CANON, createdAt: new Date() },
    ]);
    const r = await service.verifyOtp('998901234567', '123456', 'dev', '1.1.1.1');
    expect(r.user.id).toBe('canon');
  });
});

describe('AuthService verifyOtp rate limit', () => {
  it('429 per normalized phone after the cap, across spellings and IPs', async () => {
    const { service, otp } = setup();
    for (let i = 0; i < VERIFY_LIMITS.perPhone.max; i++) {
      await service.verifyOtp(i % 2 ? '998901234567' : '+998 90 123 45 67', '123456', 'd', `9.9.9.${i}`);
    }
    await expect(service.verifyOtp('+998901234567', '123456', 'd', '8.8.8.8')).rejects.toMatchObject({
      status: 429,
    });
    expect(otp.verify).toHaveBeenCalledTimes(VERIFY_LIMITS.perPhone.max);
  });

  it('429 per IP after the cap, across phones', async () => {
    const { service } = setup();
    for (let i = 0; i < VERIFY_LIMITS.perIp.max; i++) {
      await service.verifyOtp(`+99890123${String(1000 + i)}`, '123456', 'd', '5.5.5.5');
    }
    await expect(service.verifyOtp('+998909999999', '123456', 'd', '5.5.5.5')).rejects.toMatchObject({
      status: 429,
    });
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
