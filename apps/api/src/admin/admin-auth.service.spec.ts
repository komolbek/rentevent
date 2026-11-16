import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as crypto from 'crypto';

// ESM namespaces cannot be spied on; wrap randomInt so single calls can be pinned.
vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  return { ...actual, default: actual, randomInt: vi.fn(actual.randomInt) };
});
import { BadRequestException, HttpException } from '@nestjs/common';
import { AdminAuthService, RESET_LIMITS } from './admin-auth.service';
import { RateLimitService } from '../common/rate-limit.service';
import { OtpService } from '../auth/otp.service';

/** Staff phone is stored in the canonical `+998XXXXXXXXX` form. */
const PHONE = '+998901234567';
const IP = '1.1.1.1';

/** Minimal in-memory stand-in for the `oTP` Prisma delegate. */
function fakePrisma() {
  const otps: any[] = [];
  let seq = 0;
  return {
    otps,
    staff: {
      findUnique: vi.fn(async ({ where }: any) =>
        where.phoneNumber === PHONE
          ? { id: 's1', phoneNumber: PHONE, isActive: true, deletedAt: null }
          : null,
      ),
    },
    oTP: {
      deleteMany: vi.fn(async ({ where }: any) => {
        for (let i = otps.length - 1; i >= 0; i--) {
          const o = otps[i];
          const byPhone = where.phoneNumber === undefined || o.phoneNumber === where.phoneNumber;
          const byId = where.id === undefined || (where.id.not !== undefined ? o.id !== where.id.not : o.id === where.id);
          if (byPhone && byId) otps.splice(i, 1);
        }
      }),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: ++seq, verified: false, attempts: 0, createdAt: new Date(), ...data };
        otps.push(row);
        return row;
      }),
      findFirst: vi.fn(async ({ where }: any) =>
        otps
          .filter(
            (o) =>
              o.phoneNumber === where.phoneNumber &&
              o.verified === where.verified &&
              o.expiresAt > where.expiresAt.gt,
          )
          .slice(-1)[0] ?? null,
      ),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const o = otps.find((x) => x.id === where.id);
        if (!o) return { count: 0 };
        if (where.attempts?.lt !== undefined && !(o.attempts < where.attempts.lt)) return { count: 0 };
        if (where.verified === false && o.verified) return { count: 0 };
        if (data.attempts) o.attempts += data.attempts.increment;
        if (data.verified) o.verified = true;
        return { count: 1 };
      }),
    },
  };
}

function setup() {
  const prisma = fakePrisma();
  const sms = { sendAdminOTP: vi.fn(async () => ({ success: true })) };
  const rateLimit = new RateLimitService();
  const otp = new OtpService(prisma as any);
  // The shared SMS caps (cooldown, hourly, daily, global) have their own tests in
  // sms.service.spec.ts; here only the admin flow's own limits are exercised.
  const quota = { reserve: vi.fn(() => ({ slots: [] })), refund: vi.fn() };
  const service = new AdminAuthService(prisma as any, rateLimit, otp, sms as any, quota as any);
  return { prisma, sms, service, rateLimit };
}

async function status(p: Promise<unknown>): Promise<number | 'ok'> {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return e instanceof HttpException ? e.getStatus() : -1;
  }
}

async function message(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return 'ok';
  } catch (e) {
    return e instanceof HttpException ? e.message : String(e);
  }
}

/** The code that the SMS stub received on its n-th call. */
function sentCode(sms: { sendAdminOTP: { mock: { calls: unknown[][] } } }, n = 0): string {
  return sms.sendAdminOTP.mock.calls[n][1] as string;
}

const wrongCode = (real: string) => (real === '000000' ? '111111' : '000000');

describe('AdminAuthService forgot-password', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns 400 for an invalid phone', async () => {
    const { service } = setup();
    expect(await status(service.forgotPasswordSendOtp('12345', IP))).toBe(400);
    expect(await status(service.forgotPasswordVerifyOtp('abc', '123456', IP))).toBe(400);
    await expect(service.forgotPasswordSendOtp(undefined as any, 'ip')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('finds the staff row for any spelling of the phone (stored as +998...)', async () => {
    const { service, sms, prisma } = setup();
    await service.forgotPasswordSendOtp('998901234567', IP);
    expect(prisma.staff.findUnique).toHaveBeenCalledWith({ where: { phoneNumber: PHONE } });
    expect(sms.sendAdminOTP).toHaveBeenCalledWith(PHONE, expect.stringMatching(/^\d{6}$/));
    const res = await service.forgotPasswordVerifyOtp('+998 90 123 45 67', sentCode(sms), IP);
    expect(res.resetToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns 429 on the send-otp after the per-phone cap, keyed by the normalized phone', async () => {
    const { service, sms } = setup();
    const spellings = ['+998 90 123 45 67', '998901234567', '+998-90-123-45-67'];
    expect(RESET_LIMITS.sendPerPhone.max).toBe(spellings.length);
    // each call from a different IP so only the phone key can trip
    for (let i = 0; i < spellings.length; i++) {
      expect(await status(service.forgotPasswordSendOtp(spellings[i], `10.0.0.${i}`))).toBe('ok');
    }
    expect(await status(service.forgotPasswordSendOtp('+998 90 123 45 67', '10.0.0.9'))).toBe(429);
    expect(sms.sendAdminOTP).toHaveBeenCalledTimes(RESET_LIMITS.sendPerPhone.max);
  });

  it('returns 429 on send-otp after the per-IP cap, even across different phones', async () => {
    const { service } = setup();
    for (let i = 0; i < RESET_LIMITS.sendPerIp.max; i++) {
      const phone = `99890000${String(1000 + i)}`;
      expect(await status(service.forgotPasswordSendOtp(phone, '5.5.5.5'))).toBe('ok');
    }
    expect(await status(service.forgotPasswordSendOtp('998900009999', '5.5.5.5'))).toBe(429);
    // another IP is unaffected
    expect(await status(service.forgotPasswordSendOtp('998900009999', '6.6.6.6'))).toBe('ok');
  });

  it('does not burn the IP slot when the per-phone cap rejects', async () => {
    const { service, rateLimit } = setup();
    for (let i = 0; i < RESET_LIMITS.sendPerPhone.max; i++) {
      await service.forgotPasswordSendOtp(PHONE, `10.0.0.${i}`);
    }
    expect(await status(service.forgotPasswordSendOtp(PHONE, '7.7.7.7'))).toBe(429);
    expect(rateLimit.count('admin_reset_send_ip', '7.7.7.7', RESET_LIMITS.sendPerIp.windowMs)).toBe(0);
  });

  it('returns 429 on verify-otp after the per-phone cap', async () => {
    const { service } = setup();
    for (let i = 0; i < RESET_LIMITS.verifyPerPhone.max; i++) {
      expect(await status(service.forgotPasswordVerifyOtp(PHONE, '000000', IP))).toBe(400);
    }
    expect(await status(service.forgotPasswordVerifyOtp('+998 90 123 45 67', '000000', IP))).toBe(429);
  });

  it('returns 429 on verify-otp after the per-IP cap, even across different phones', async () => {
    const { service } = setup();
    for (let i = 0; i < RESET_LIMITS.verifyPerIp.max; i++) {
      const phone = `99890000${String(1000 + i)}`;
      expect(await status(service.forgotPasswordVerifyOtp(phone, '000000', '5.5.5.5'))).toBe(400);
    }
    expect(await status(service.forgotPasswordVerifyOtp('998900009999', '000000', '5.5.5.5'))).toBe(429);
    // another IP is unaffected
    expect(await status(service.forgotPasswordVerifyOtp('998900009999', '000000', '6.6.6.6'))).toBe(400);
  });

  it('locks the reset flow after the daily failed-verify cap, until the window ends', async () => {
    const { service, sms } = setup();
    const firstFailureAt = Date.now();
    let failures = 0;
    let sends = 0;
    while (failures < RESET_LIMITS.failedPerPhone.max) {
      await service.forgotPasswordSendOtp(PHONE, IP);
      const bad = wrongCode(sentCode(sms, sends++));
      for (let i = 0; i < RESET_LIMITS.verifyPerPhone.max && failures < RESET_LIMITS.failedPerPhone.max; i++) {
        expect(await status(service.forgotPasswordVerifyOtp(PHONE, bad, IP))).toBe(400);
        failures++;
      }
      vi.advanceTimersByTime(RESET_LIMITS.verifyPerPhone.windowMs + 1000);
    }
    // locked: verify and send both 429, even after the short windows passed
    expect(await status(service.forgotPasswordVerifyOtp(PHONE, '000000', IP))).toBe(429);
    expect(await status(service.forgotPasswordSendOtp(PHONE, '9.9.9.9'))).toBe(429);

    // the message shows the real remaining time, counted from the oldest failure
    const remainingMs = firstFailureAt + RESET_LIMITS.failedPerPhone.windowMs - Date.now();
    const msg = await message(service.forgotPasswordSendOtp(PHONE, '9.9.9.9'));
    expect(msg).toBe(
      `Слишком много попыток. Повторите через ${Math.ceil(Math.ceil(remainingMs / 60_000) / 60)} ч.`,
    );
    expect(remainingMs).toBeLessThan(RESET_LIMITS.failedPerPhone.windowMs);

    // unlocked after the daily window
    vi.advanceTimersByTime(RESET_LIMITS.failedPerPhone.windowMs + 1000);
    expect(await status(service.forgotPasswordSendOtp(PHONE, '9.9.9.9'))).toBe('ok');
  });

  it('does not count verifies without a live code (or for unknown phones) toward the lockout', async () => {
    const { service, rateLimit, sms } = setup();
    const windowMs = RESET_LIMITS.failedPerPhone.windowMs;
    // many attempts with no OTP issued, spread over time to stay under the short caps
    for (let round = 0; round < 4; round++) {
      for (let i = 0; i < RESET_LIMITS.verifyPerPhone.max; i++) {
        expect(await status(service.forgotPasswordVerifyOtp(PHONE, '000000', IP))).toBe(400);
        expect(await status(service.forgotPasswordVerifyOtp('+998900000000', '000000', IP))).toBe(400);
      }
      vi.advanceTimersByTime(RESET_LIMITS.verifyPerPhone.windowMs + 1000);
    }
    expect(rateLimit.count('admin_reset_failed', PHONE, windowMs)).toBe(0);
    expect(rateLimit.count('admin_reset_failed', '+998900000000', windowMs)).toBe(0);

    // a real user can still reset
    await service.forgotPasswordSendOtp(PHONE, IP);
    const res = await service.forgotPasswordVerifyOtp(PHONE, sentCode(sms), IP);
    expect(res.resetToken).toMatch(/^[0-9a-f]{64}$/);
  });

  it('counts a wrong code against a live OTP toward the lockout', async () => {
    const { service, rateLimit, sms } = setup();
    await service.forgotPasswordSendOtp(PHONE, IP);
    await status(service.forgotPasswordVerifyOtp(PHONE, wrongCode(sentCode(sms)), IP));
    expect(rateLimit.count('admin_reset_failed', PHONE, RESET_LIMITS.failedPerPhone.windowMs)).toBe(1);
  });

  it('answers verify-otp identically for unknown phone, missing code and wrong code', async () => {
    const { service, sms } = setup();
    const unknown = await message(service.forgotPasswordVerifyOtp('+998900000000', '123456', IP));
    const noCode = await message(service.forgotPasswordVerifyOtp(PHONE, '123456', IP));
    await service.forgotPasswordSendOtp(PHONE, IP);
    const wrong = await message(service.forgotPasswordVerifyOtp(PHONE, wrongCode(sentCode(sms)), IP));

    expect(await status(service.forgotPasswordVerifyOtp('+998900000000', '123456', IP))).toBe(400);
    expect(unknown).toBe(noCode);
    expect(noCode).toBe(wrong);
    expect(wrong).not.toBe('ok');
  });

  it('rejects a malformed code with 400 before any counter is touched', async () => {
    const { service, rateLimit } = setup();
    for (const bad of ['12345', '1234567', 'abcdef', '12345a', ' 123456', '', undefined, null, 123456]) {
      expect(await status(service.forgotPasswordVerifyOtp(PHONE, bad as any, IP))).toBe(400);
    }
    expect(rateLimit.count('admin_reset_verify_phone', PHONE, RESET_LIMITS.verifyPerPhone.windowMs)).toBe(0);
    expect(rateLimit.count('admin_reset_verify_ip', IP, RESET_LIMITS.verifyPerIp.windowMs)).toBe(0);
    expect(rateLimit.count('admin_reset_failed', PHONE, RESET_LIMITS.failedPerPhone.windowMs)).toBe(0);
  });

  it('rejects the old OTP once a new one is issued, and leaves other phones alone', async () => {
    // Force two distinct codes so the "old code rejected" check always runs.
    const randomInt = vi.mocked(crypto.randomInt);
    randomInt.mockClear();
    randomInt
      .mockImplementationOnce((() => 111111) as any)
      .mockImplementationOnce((() => 222222) as any);
    const { service, sms, prisma } = setup();
    prisma.otps.push({
      id: 99, phoneNumber: '+998911111111', code: '777777', verified: false,
      attempts: 0, createdAt: new Date(), expiresAt: new Date(Date.now() + 60000),
    });

    await service.forgotPasswordSendOtp(PHONE, IP);
    const oldCode = sentCode(sms, 0);
    await service.forgotPasswordSendOtp(PHONE, IP);
    const newCode = sentCode(sms, 1);

    expect(randomInt).toHaveBeenCalledTimes(2);
    expect(oldCode).toBe('111111');
    expect(newCode).toBe('222222');
    expect(await status(service.forgotPasswordVerifyOtp(PHONE, oldCode, IP))).toBe(400);
    expect(prisma.otps.filter((o) => o.phoneNumber === PHONE)).toHaveLength(1);
    expect(prisma.otps.some((o) => o.phoneNumber === '+998911111111')).toBe(true);
    const res = await service.forgotPasswordVerifyOtp('+998 90 123 45 67', newCode, IP);
    expect(res.resetToken).toMatch(/^[0-9a-f]{64}$/);
  });
});
