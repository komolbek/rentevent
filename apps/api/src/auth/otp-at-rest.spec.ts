import { afterEach, describe, expect, it, vi } from 'vitest';
import * as crypto from 'crypto';
import { OtpService, hashOtp, otpKey } from './otp.service';

vi.mock('crypto', async (orig) => {
  const real = await orig<typeof import('crypto')>();
  return { ...real, timingSafeEqual: vi.fn(real.timingSafeEqual) };
});

const PHONE = '+998901234567';

/** In-memory `oTP` delegate: create, deleteMany (phoneNumber/id/createdAt), findFirst, updateMany. */
function fakePrisma() {
  const otps: any[] = [];
  let seq = 0;
  return {
    otps,
    staff: { findMany: vi.fn(async () => []) },
    oTP: {
      create: vi.fn(async ({ data }: any) => {
        const row = { id: ++seq, verified: false, attempts: 0, createdAt: new Date(), ...data };
        otps.push(row);
        return row;
      }),
      deleteMany: vi.fn(async ({ where }: any) => {
        let count = 0;
        for (let i = otps.length - 1; i >= 0; i--) {
          const o = otps[i];
          const hit =
            (where.phoneNumber === undefined || o.phoneNumber === where.phoneNumber) &&
            (where.id === undefined ||
              (where.id.not !== undefined ? o.id !== where.id.not : o.id === where.id)) &&
            (where.createdAt === undefined || o.createdAt < where.createdAt.lt);
          if (hit) {
            otps.splice(i, 1);
            count++;
          }
        }
        return { count };
      }),
      findFirst: vi.fn(
        async ({ where }: any) =>
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
        if (data.attempts?.increment) o.attempts += data.attempts.increment;
        if (data.verified !== undefined) o.verified = data.verified;
        return { count: 1 };
      }),
    },
  };
}

function setup() {
  const prisma = fakePrisma();
  const service = new OtpService(prisma as any);
  let sent = '';
  const send = async (code: string) => {
    sent = code;
    return { success: true } as any;
  };
  return { prisma, service, send, sentCode: () => sent };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('SMS6: purpose namespace', () => {
  it('a customer code does not verify for the admin reset, and the reverse', async () => {
    const a = setup();
    await a.service.issueAndSend('login', PHONE, a.send);
    expect((await a.service.verify('admin_reset', PHONE, a.sentCode())).valid).toBe(false);
    expect((await a.service.verify('login', PHONE, a.sentCode())).valid).toBe(true);

    const b = setup();
    await b.service.issueAndSend('admin_reset', PHONE, b.send);
    expect((await b.service.verify('login', PHONE, b.sentCode())).valid).toBe(false);
    expect((await b.service.verify('admin_reset', PHONE, b.sentCode())).valid).toBe(true);
  });

  it('stores the purpose-prefixed key in the existing phone column; the other purpose keeps its code', async () => {
    const s = setup();
    await s.service.issueAndSend('login', PHONE, s.send);
    await s.service.issueAndSend('admin_reset', PHONE, s.send);
    expect(s.prisma.otps.map((o) => o.phoneNumber).sort()).toEqual([
      otpKey('admin_reset', PHONE),
      otpKey('login', PHONE),
    ]);
  });
});

describe('SMS6: code at rest', () => {
  it('the DB value is HMAC-SHA256(code, OTP_PEPPER) hex, never the plain code', async () => {
    vi.stubEnv('OTP_PEPPER', 'pepper-for-test');
    const s = setup();
    await s.service.issueAndSend('login', PHONE, s.send);
    const stored = s.prisma.otps[0].code;
    expect(stored).not.toBe(s.sentCode());
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
    expect(stored).toBe(crypto.createHmac('sha256', 'pepper-for-test').update(s.sentCode()).digest('hex'));
  });

  it('a different pepper does not verify the row', async () => {
    vi.stubEnv('OTP_PEPPER', 'pepper-one');
    const s = setup();
    await s.service.issueAndSend('login', PHONE, s.send);
    vi.stubEnv('OTP_PEPPER', 'pepper-two');
    expect((await s.service.verify('login', PHONE, s.sentCode())).valid).toBe(false);
  });

  it('compares with crypto.timingSafeEqual', async () => {
    const spy = vi.mocked(crypto.timingSafeEqual);
    spy.mockClear();
    const s = setup();
    await s.service.issueAndSend('login', PHONE, s.send);
    await s.service.verify('login', PHONE, s.sentCode());
    expect(spy).toHaveBeenCalled();
  });

  it('a legacy plain-text row (old key, plain code) is not found and does not crash', async () => {
    const s = setup();
    s.prisma.otps.push({
      id: 500, phoneNumber: PHONE, code: '123456', verified: false, attempts: 0,
      createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000),
    });
    expect(await s.service.verify('login', PHONE, '123456')).toMatchObject({ valid: false, reason: 'not_found' });
    // even filed under the new key, a plain row is just a mismatch
    s.prisma.otps[0].phoneNumber = otpKey('login', PHONE);
    expect(await s.service.verify('login', PHONE, '123456')).toMatchObject({ valid: false, reason: 'wrong_code' });
  });
});

describe('SMS6: purge', () => {
  it('removes rows older than one day only', async () => {
    const s = setup();
    const day = 24 * 3_600_000;
    const mk = (id: number, ageMs: number, extra: object = {}) =>
      s.prisma.otps.push({
        id, phoneNumber: otpKey('login', PHONE), code: 'x', verified: false, attempts: 0,
        createdAt: new Date(Date.now() - ageMs), expiresAt: new Date(Date.now() - ageMs + 300_000), ...extra,
      });
    mk(1, day + 60_000); // expired, old
    mk(2, day + 60_000, { verified: true }); // verified, old
    mk(3, 2 * 3_600_000); // expired but recent
    mk(4, 60_000, { expiresAt: new Date(Date.now() + 240_000) }); // live
    expect(await s.service.purgeOld()).toBe(2);
    expect(s.prisma.otps.map((o) => o.id)).toEqual([3, 4]);
  });

  it('runs after a send without blocking it, and a purge failure never fails the request', async () => {
    const s = setup();
    s.prisma.oTP.deleteMany.mockImplementation(async ({ where }: any) => {
      if (where.createdAt) throw new Error('db down');
      return { count: 0 };
    });
    const result = await s.service.issueAndSend('login', PHONE, s.send);
    expect(result.success).toBe(true);
    await new Promise((r) => setImmediate(r));
    expect(s.prisma.oTP.deleteMany.mock.calls.some((c: any[]) => c[0].where.createdAt)).toBe(true);
  });
});

describe('SMS6: OTP_PEPPER at boot', () => {
  it('production without OTP_PEPPER fails boot and names only the variable', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('OTP_PEPPER', '');
    await expect(setup().service.onModuleInit()).rejects.toThrow('OTP_PEPPER is required when NODE_ENV=production');
  });

  it('production with OTP_PEPPER boots; development/test use a fixed default', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('OTP_PEPPER', 'set');
    await expect(setup().service.onModuleInit()).resolves.toBeUndefined();
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('OTP_PEPPER', '');
    await expect(setup().service.onModuleInit()).resolves.toBeUndefined();
    expect(hashOtp('123456')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('SMS6 + SMS4: test-auth phone with hashed codes', () => {
  it('the fixed code is stored hashed and logs the test phone in; no SMS is sent', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('OTP_PEPPER', 'pepper-for-test');
    vi.stubEnv('ENABLE_TEST_AUTH', 'true');
    vi.stubEnv('TEST_PHONE_NUMBERS', '998901234567');
    vi.stubEnv('TEST_OTP_CODE', '424242');
    const s = setup();
    const send = vi.fn(async () => ({ success: true }) as any);
    await s.service.issueAndSend('login', PHONE, send, { allowTestAuth: true });
    expect(send).not.toHaveBeenCalled();
    expect(s.prisma.otps[0].code).toBe(hashOtp('424242'));
    expect((await s.service.verify('login', PHONE, '424242')).valid).toBe(true);
  });
});
