import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { OtpService, hashOtp } from './otp.service';
import { SmsService } from './sms.service';
import { AuthService } from './auth.service';
import { SmsQuotaService } from './sms-quota.service';
import { RateLimitService } from '../common/rate-limit.service';
import { AdminAuthService } from '../admin/admin-auth.service';
import { TestAuthConfigError, parseTestAuthConfig } from './test-auth';

// Obviously fake values used only inside this test file.
const REVIEW = '998900000001';
const REVIEW2 = '998900000002';
const STAFF = '+998900000003';
const FIXED = '654321';

function fakePrisma(staffPhones: string[] = []) {
  const otps: any[] = [];
  let seq = 0;
  return {
    otps,
    staff: {
      findMany: vi.fn(async ({ where }: any) =>
        staffPhones.filter((p) => where.phoneNumber.in.includes(p)).map((p) => ({ phoneNumber: p })),
      ),
      findUnique: vi.fn(async ({ where }: any) =>
        staffPhones.includes(where.phoneNumber)
          ? { id: 's1', phoneNumber: where.phoneNumber, isActive: true, deletedAt: null }
          : null,
      ),
    },
    oTP: {
      create: vi.fn(async ({ data }: any) => {
        const row = { id: ++seq, verified: false, attempts: 0, createdAt: new Date(), ...data };
        otps.push(row);
        return row;
      }),
      deleteMany: vi.fn(async ({ where }: any) => {
        for (let i = otps.length - 1; i >= 0; i--) {
          const o = otps[i];
          const byPhone = where.phoneNumber === undefined || o.phoneNumber === where.phoneNumber;
          if (where.createdAt) {
            if (o.createdAt < where.createdAt.lt) otps.splice(i, 1);
            continue;
          }
          const byId =
            where.id === undefined ||
            (where.id.not !== undefined ? o.id !== where.id.not : o.id === where.id);
          if (byPhone && byId) otps.splice(i, 1);
        }
        return { count: 0 };
      }),
    },
  };
}

function stack(staffPhones: string[] = []) {
  const prisma = fakePrisma(staffPhones);
  const rateLimit = new RateLimitService();
  const quota = new SmsQuotaService(rateLimit);
  const sms = new SmsService();
  const otp = new OtpService(prisma as any);
  const auth = new AuthService(prisma as any, otp, {} as any, sms, rateLimit, quota);
  const admin = new AdminAuthService(prisma as any, rateLimit, otp, sms, quota);
  const sendOTP = vi.spyOn(sms, 'sendOTP').mockResolvedValue({ success: true });
  const sendAdminOTP = vi.spyOn(sms, 'sendAdminOTP').mockResolvedValue({ success: true });
  return { prisma, rateLimit, quota, sms, otp, auth, admin, sendOTP, sendAdminOTP };
}

function testEnv(over: Record<string, string> = {}) {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('OTP_PEPPER', 'test-pepper');
  vi.stubEnv('ENABLE_TEST_AUTH', 'true');
  vi.stubEnv('TEST_PHONE_NUMBERS', REVIEW);
  vi.stubEnv('TEST_OTP_CODE', FIXED);
  for (const [k, v] of Object.entries(over)) vi.stubEnv(k, v);
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('SMS4: boot validation', () => {
  it('disabled by default and outside ENABLE_TEST_AUTH=true', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('TEST_OTP_CODE', 'abc');
    expect(parseTestAuthConfig().enabled).toBe(false);
  });

  it('production with 3 phones fails boot', async () => {
    testEnv({ TEST_PHONE_NUMBERS: `${REVIEW},${REVIEW2},998900000004` });
    await expect(stack().otp.onModuleInit()).rejects.toThrow(TestAuthConfigError);
  });

  it('production accepts 1 or 2 phones, normalizes and de-duplicates', () => {
    testEnv({ TEST_PHONE_NUMBERS: `${REVIEW}, +${REVIEW},${REVIEW2}` });
    expect(parseTestAuthConfig().phones).toEqual([`+${REVIEW}`, `+${REVIEW2}`]);
  });

  it.each(['12345', '1234567', 'abcdef', '12 456', ''])('malformed TEST_OTP_CODE %j fails boot', async (code) => {
    testEnv({ TEST_OTP_CODE: code });
    await expect(stack().otp.onModuleInit()).rejects.toThrow(TestAuthConfigError);
  });

  it.each(['90 000 00 01', '99890000000', '+99890000000a', '12345'])('malformed phone %j fails boot', async (p) => {
    testEnv({ TEST_PHONE_NUMBERS: p });
    await expect(stack().otp.onModuleInit()).rejects.toThrow(/malformed/);
  });

  it('production with enabled but no phones fails boot', async () => {
    testEnv({ TEST_PHONE_NUMBERS: '' });
    await expect(stack().otp.onModuleInit()).rejects.toThrow(TestAuthConfigError);
  });

  it('a test phone that belongs to staff fails boot (either spelling)', async () => {
    testEnv({ TEST_PHONE_NUMBERS: STAFF.slice(1) });
    await expect(stack([STAFF]).otp.onModuleInit()).rejects.toThrow(/staff phone/);
    await expect(stack([STAFF.slice(1)]).otp.onModuleInit()).rejects.toThrow(/staff phone/);
  });

  it('valid production config boots with one loud warning, masked phone, no code', async () => {
    testEnv();
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    await expect(stack().otp.onModuleInit()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    const line = String(warn.mock.calls[0][0]);
    expect(line).toContain('TEST AUTH IS ACTIVE');
    expect(line).not.toContain(FIXED);
    expect(line).not.toContain(REVIEW);
  });

  it('disabled: boots silently without touching the database', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('OTP_PEPPER', 'test-pepper');
    const s = stack();
    await s.otp.onModuleInit();
    expect(s.prisma.staff.findMany).not.toHaveBeenCalled();
  });
});

describe('SMS4: behaviour', () => {
  it('a test phone gets the fixed code, no SMS is sent and the global budget is untouched', async () => {
    testEnv();
    const s = stack();
    await s.auth.sendOtp(`+${REVIEW}`, '1.1.1.1');
    expect(s.sendOTP).not.toHaveBeenCalled();
    expect(s.prisma.otps).toHaveLength(1);
    expect(s.prisma.otps[0].code).toBe(hashOtp(FIXED));
    expect(s.rateLimit.count('sms_global_day', 'all', 24 * 3_600_000)).toBe(0);
    expect(s.otp.isTestAuthEnabled()).toBe(true);
  });

  it('the fixed code verifies', async () => {
    testEnv();
    const s = stack();
    const row = { id: 1, phoneNumber: `login:+${REVIEW}`, code: hashOtp(FIXED), attempts: 0, verified: false, expiresAt: new Date(Date.now() + 60_000) };
    (s.prisma as any).oTP.findFirst = async () => row;
    (s.prisma as any).oTP.updateMany = async () => ({ count: 1 });
    expect((await s.otp.verify('login', `+${REVIEW}`, FIXED)).valid).toBe(true);
  });

  it('a normal phone still gets a random code and a real SMS', async () => {
    testEnv();
    const s = stack();
    await s.auth.sendOtp('+998901234567', '1.1.1.1');
    expect(s.sendOTP).toHaveBeenCalledTimes(1);
    expect(s.prisma.otps[0].code).toMatch(/^[0-9a-f]{64}$/);
  });

  it('per-phone and per-IP caps still apply to test phones', async () => {
    testEnv();
    const s = stack();
    await s.auth.sendOtp(REVIEW, '1.1.1.1');
    await expect(s.auth.sendOtp(REVIEW, '2.2.2.2')).rejects.toMatchObject({ status: 429 });
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(61_000);
      await s.auth.sendOtp(`+99890000${String(1000 + i)}`, '9.9.9.9').catch(() => undefined);
    }
    await expect(s.auth.sendOtp(REVIEW2, '9.9.9.9')).rejects.toMatchObject({ status: 429 });
  });

  it('a staff phone in the list is ignored for admin reset: random code, real SMS', async () => {
    // Boot would refuse this config; the runtime must still never leak the fixed code into admin reset.
    testEnv({ TEST_PHONE_NUMBERS: STAFF.slice(1) });
    const s = stack([STAFF]);
    await s.admin.forgotPasswordSendOtp(STAFF, '1.1.1.1');
    expect(s.sendAdminOTP).toHaveBeenCalledTimes(1);
    expect(s.prisma.otps).toHaveLength(1);
    expect(s.prisma.otps[0].code).not.toBe(hashOtp(FIXED));
    expect(s.prisma.otps[0].code).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOtp(s.sendAdminOTP.mock.calls[0][1])).toBe(s.prisma.otps[0].code);
  });

  it('a bad config at runtime fails closed (no test phone)', () => {
    testEnv({ TEST_OTP_CODE: 'x' });
    expect(stack().otp.isTestPhone(`+${REVIEW}`)).toBe(false);
  });

  it('no log line contains the code or the full phone', async () => {
    testEnv();
    const logs: string[] = [];
    for (const m of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
      vi.spyOn(Logger.prototype, m).mockImplementation((msg: any) => void logs.push(String(msg)));
    }
    const spies = (['log', 'warn', 'error', 'info'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation((...a: any[]) => void logs.push(a.join(' '))),
    );
    const s = stack();
    await s.otp.onModuleInit();
    await s.auth.sendOtp(REVIEW, '1.1.1.1');
    spies.forEach((x) => x.mockRestore());
    expect(logs.join('\n')).not.toContain(FIXED);
    expect(logs.join('\n')).not.toContain(REVIEW);
  });
});
