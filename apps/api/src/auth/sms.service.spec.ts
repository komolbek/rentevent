import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import {
  BREAKER_OPEN_MS,
  BREAKER_THRESHOLD,
  SMS_TIMEOUT_MS,
  SmsConfigError,
  SmsService,
  buildOtpMessage,
  parseSmsProvider,
} from './sms.service';
import { OtpService } from './otp.service';
import { AuthService } from './auth.service';
import { SMS_LIMITS, SmsQuotaService, smsDailyCap } from './sms-quota.service';
import { RateLimitService } from '../common/rate-limit.service';
import { AdminAuthService } from '../admin/admin-auth.service';
import { RateLimitedFilter } from './otp-errors';

const PHONE = '+998901234567';

/** The plain code the gateway was asked to send in the n-th call (the DB only holds its HMAC). */
function sentCode(fetchMock: { mock: { calls: unknown[][] } }, n: number): string {
  const init = fetchMock.mock.calls[n][1] as { body: string };
  return /(\d{6})\./.exec(JSON.parse(init.body).message)![1];
}
const MIN = 60_000;
const HOUR = 60 * MIN;

/** Minimal in-memory stand-in for the `oTP`, `staff` and `user` Prisma delegates. */
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

const okResponse = () =>
  ({ status: 200, ok: true, json: async () => ({ status: 'sent', id: 'm1' }) }) as any;

/** A fetch that never answers until the request is aborted, like a hung provider. */
const hangingFetch = () =>
  vi.fn(
    (_url: string, init: any) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      }),
  );

function stack(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetchMock);
  const prisma = fakePrisma();
  const rateLimit = new RateLimitService();
  const quota = new SmsQuotaService(rateLimit);
  const sms = new SmsService();
  const otp = new OtpService(prisma as any);
  const auth = new AuthService(prisma as any, otp, {} as any, sms, rateLimit, quota);
  const admin = new AdminAuthService(prisma as any, rateLimit, otp, sms, quota);
  return { prisma, rateLimit, quota, sms, otp, auth, admin };
}

const gatewayEnv = () => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('SMS_PROVIDER', 'gateway');
  vi.stubEnv('SMS_GATEWAY_URL', 'https://gw.example/api/v1');
  vi.stubEnv('SMS_GATEWAY_API_KEY', 'test-key');
};

/** Sends for `phone` and swallows the error, returning the HTTP status (or 'ok'). */
async function statusOf(p: Promise<unknown>): Promise<number | 'ok'> {
  try {
    await p;
    return 'ok';
  } catch (e: any) {
    return e.getStatus?.() ?? -1;
  }
}

async function bodyOf(p: Promise<unknown>): Promise<any> {
  try {
    await p;
    return null;
  } catch (e: any) {
    return e.getResponse();
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SMS1: strict provider config', () => {
  it('rejects unknown provider values', () => {
    for (const bad of ['Gateway', 'eskiz ', 'foo', 'eskiz', ' gateway', 'MOCK']) {
      expect(() => parseSmsProvider(bad), bad).toThrow(SmsConfigError);
    }
  });

  it('accepts mock and gateway; unset or empty means mock', () => {
    expect(parseSmsProvider('mock')).toBe('mock');
    expect(parseSmsProvider('gateway')).toBe('gateway');
    expect(parseSmsProvider(undefined)).toBe('mock');
    expect(parseSmsProvider('')).toBe('mock');
  });

  it('boot throws on an unknown provider in every environment', () => {
    for (const env of ['production', 'development', 'test']) {
      vi.stubEnv('NODE_ENV', env);
      vi.stubEnv('SMS_PROVIDER', 'Gateway');
      expect(() => new SmsService().onModuleInit(), env).toThrow(SmsConfigError);
    }
  });

  it('production boot throws on mock, unset, empty or missing gateway URL/key', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SMS_GATEWAY_URL', 'https://gw.example/api/v1');
    vi.stubEnv('SMS_GATEWAY_API_KEY', 'k');
    for (const provider of ['mock', '', undefined]) {
      vi.stubEnv('SMS_PROVIDER', provider as any);
      if (provider === undefined) delete process.env.SMS_PROVIDER;
      expect(() => new SmsService().onModuleInit(), String(provider)).toThrow(SmsConfigError);
    }
    vi.stubEnv('SMS_PROVIDER', 'gateway');
    vi.stubEnv('SMS_GATEWAY_URL', '');
    expect(() => new SmsService().onModuleInit()).toThrow(SmsConfigError);
    vi.stubEnv('SMS_GATEWAY_URL', 'https://gw.example/api/v1');
    vi.stubEnv('SMS_GATEWAY_API_KEY', '');
    expect(() => new SmsService().onModuleInit()).toThrow(SmsConfigError);
  });

  it('production boot passes with a complete gateway config', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SMS_PROVIDER', 'gateway');
    vi.stubEnv('SMS_GATEWAY_URL', 'https://gw.example/api/v1');
    vi.stubEnv('SMS_GATEWAY_API_KEY', 'k');
    expect(() => new SmsService().onModuleInit()).not.toThrow();
  });

  it('test env with mock boots and works, printing the code', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('SMS_PROVIDER', 'mock');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const sms = new SmsService();
    expect(() => sms.onModuleInit()).not.toThrow();
    expect((await sms.sendOTP(PHONE, '482913')).success).toBe(true);
    expect(log.mock.calls.flat().join(' ')).toContain('482913');
  });

  it('mock output never contains the code outside development/test', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    for (const env of ['production', 'staging', undefined]) {
      vi.stubEnv('SMS_PROVIDER', 'mock');
      if (env === undefined) delete process.env.NODE_ENV;
      else vi.stubEnv('NODE_ENV', env);
      const sms = new SmsService();
      const a = await sms.sendOTP(PHONE, '482913');
      const b = await sms.sendAdminOTP(PHONE, '482913');
      // nothing is "sent", so nothing pretends to be
      expect(a.success, String(env)).toBe(false);
      expect(b.success, String(env)).toBe(false);
      expect(sms.getDevOTPLog()).toHaveLength(0);
    }
    const printed = [...log.mock.calls, ...err.mock.calls, ...logger.mock.calls].flat().join(' ');
    expect(printed).not.toContain('482913');
  });
});

describe('SMS2: timeout, breaker and a clean failure path', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    gatewayEnv();
  });

  it('sends the gateway request with the API key and a plain phone', async () => {
    const fetchMock = vi.fn(async () => okResponse());
    const { auth } = stack(fetchMock as any);
    await auth.sendOtp('+998 90 123 45 67', '1.1.1.1');
    const [url, init] = fetchMock.mock.calls[0] as any;
    expect(url).toBe('https://gw.example/api/v1/sms/send');
    expect(init.headers['X-API-Key']).toBe('test-key');
    expect(JSON.parse(init.body).phone).toBe('998901234567');
    expect(init.signal).toBeDefined();
  });

  it('a hanging provider gives 503 sms_unavailable within 8.5 s and the previous code still works', async () => {
    const fetchMock = vi.fn(async () => okResponse());
    const { auth, otp, prisma } = stack(fetchMock as any);
    await auth.sendOtp(PHONE, '1.1.1.1');
    const storedPrevious = prisma.otps[0].code;
    const previous = sentCode(fetchMock, 0);

    vi.advanceTimersByTime(61_000);
    fetchMock.mockImplementation(hangingFetch() as any);
    const started = Date.now();
    const pending = bodyOf(auth.sendOtp(PHONE, '1.1.1.1'));
    await vi.advanceTimersByTimeAsync(8500);
    const body = await pending;

    expect(Date.now() - started).toBeLessThanOrEqual(8500);
    expect(SMS_TIMEOUT_MS).toBeLessThanOrEqual(8000);
    expect(body).toMatchObject({ statusCode: 503, code: 'sms_unavailable' });
    expect(typeof body.message).toBe('string');
    // the dead row is gone, the earlier code is the only one and it verifies
    expect(prisma.otps).toHaveLength(1);
    expect(prisma.otps[0].code).toBe(storedPrevious);
    expect((await otp.verify('login', PHONE, previous)).valid).toBe(true);
  });

  it('a successful send replaces the previous code', async () => {
    const { auth, prisma } = stack(vi.fn(async () => okResponse()) as any);
    await auth.sendOtp(PHONE, '1.1.1.1');
    vi.advanceTimersByTime(61_000);
    await auth.sendOtp(PHONE, '1.1.1.1');
    expect(prisma.otps).toHaveLength(1);
  });

  it('maps HTTP 429, 5xx, 401 and network errors to 503 sms_unavailable', async () => {
    const cases: any[] = [
      async () => ({ status: 429, ok: false, json: async () => ({ message: 'throttled' }) }),
      async () => ({ status: 502, ok: false, json: async () => ({}) }),
      async () => ({ status: 401, ok: false, json: async () => ({}) }),
      async () => ({ status: 200, ok: true, json: async () => ({ status: 'failed', errorMessage: 'x' }) }),
      async () => {
        throw new TypeError('fetch failed');
      },
    ];
    for (const impl of cases) {
      const { auth } = stack(vi.fn(impl) as any);
      expect(await bodyOf(auth.sendOtp(PHONE, '1.1.1.1'))).toMatchObject({
        statusCode: 503,
        code: 'sms_unavailable',
      });
    }
  });

  it('a failed send does not consume the phone, IP or global budget', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const { auth, rateLimit } = stack(fetchMock as any);
    for (let i = 0; i < 3; i++) {
      expect(await statusOf(auth.sendOtp(PHONE, '1.1.1.1'))).toBe(503);
    }
    for (const [ns, key, win] of [
      ['sms_phone_cooldown', PHONE, MIN],
      ['sms_phone_hour', PHONE, HOUR],
      ['sms_phone_day', PHONE, 24 * HOUR],
      ['sms_ip_window', '1.1.1.1', 15 * MIN],
      ['sms_ip_day', '1.1.1.1', 24 * HOUR],
      ['sms_global_day', 'all', 24 * HOUR],
    ] as const) {
      expect(rateLimit.count(ns, key, win), ns).toBe(0);
    }
    // so the user can retry at once once the provider is back
    fetchMock.mockImplementation((async () => okResponse()) as any);
    expect(await statusOf(auth.sendOtp(PHONE, '1.1.1.1'))).toBe('ok');
  });

  it('the breaker opens after 5 consecutive failures for 30 s, then closes on a success', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const { auth, sms } = stack(fetchMock as any);
    for (let i = 0; i < BREAKER_THRESHOLD; i++) {
      expect(sms.isCircuitOpen()).toBe(false);
      await statusOf(auth.sendOtp(PHONE, '1.1.1.1'));
    }
    expect(sms.isCircuitOpen()).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(BREAKER_THRESHOLD);

    // open: 503 at once, the provider is not called, nothing is written
    expect(await bodyOf(auth.sendOtp(PHONE, '1.1.1.1'))).toMatchObject({ code: 'sms_unavailable' });
    expect(fetchMock).toHaveBeenCalledTimes(BREAKER_THRESHOLD);

    vi.advanceTimersByTime(BREAKER_OPEN_MS + 1);
    expect(sms.isCircuitOpen()).toBe(false);
    fetchMock.mockImplementation((async () => okResponse()) as any);
    expect(await statusOf(auth.sendOtp(PHONE, '1.1.1.1'))).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(BREAKER_THRESHOLD + 1);

    // closed for good: one new failure no longer opens it
    fetchMock.mockImplementation((async () => {
      throw new TypeError('x');
    }) as any);
    vi.advanceTimersByTime(61_000);
    await statusOf(auth.sendOtp(PHONE, '1.1.1.1'));
    expect(sms.isCircuitOpen()).toBe(false);
  });

  it('a failure right after the open window re-opens the breaker', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const { auth, sms } = stack(fetchMock as any);
    for (let i = 0; i < BREAKER_THRESHOLD; i++) await statusOf(auth.sendOtp(PHONE, '1.1.1.1'));
    vi.advanceTimersByTime(BREAKER_OPEN_MS + 1);
    await statusOf(auth.sendOtp(PHONE, '1.1.1.1'));
    expect(sms.isCircuitOpen()).toBe(true);
  });

  it('a request-specific rejection does not count toward the breaker', async () => {
    const fetchMock = vi.fn(async () => ({
      status: 200,
      ok: true,
      json: async () => ({ status: 'failed' }),
    }));
    const { auth, sms } = stack(fetchMock as any);
    for (let i = 0; i < BREAKER_THRESHOLD + 2; i++) await statusOf(auth.sendOtp(PHONE, '1.1.1.1'));
    expect(sms.isCircuitOpen()).toBe(false);
  });

  it('admin reset: a failed send keeps the previous code valid and gives the budget back', async () => {
    const fetchMock = vi.fn(async () => okResponse());
    const { admin, prisma, otp, rateLimit } = stack(fetchMock as any);
    await admin.forgotPasswordSendOtp(PHONE, '1.1.1.1');
    await admin.settled();
    const storedPrevious = prisma.otps[0].code;
    const previous = sentCode(fetchMock, 0);

    vi.advanceTimersByTime(61_000);
    fetchMock.mockImplementation((async () => {
      throw new TypeError('fetch failed');
    }) as any);
    await admin.forgotPasswordSendOtp(PHONE, '1.1.1.1');
    await admin.settled();

    expect(prisma.otps).toHaveLength(1);
    expect((await otp.verify('admin_reset', PHONE, previous)).valid).toBe(true);
    // only the successful send is counted
    expect(rateLimit.count('admin_sms_phone_hour', PHONE, HOUR)).toBe(1);
    expect(rateLimit.count('admin_reset_send_phone', PHONE, 15 * MIN)).toBe(1);
  });
});

describe('SMS3: abuse caps and server cooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    gatewayEnv();
  });

  const phoneN = (n: number) => `+99890${String(1000000 + n)}`;

  it('per phone: 1 per 60 s, with retry_after_seconds in the 429 body', async () => {
    const { auth } = stack(vi.fn(async () => okResponse()) as any);
    await auth.sendOtp(PHONE, '1.1.1.1');
    vi.advanceTimersByTime(20_000);
    const body = await bodyOf(auth.sendOtp(PHONE, '2.2.2.2'));
    expect(body).toMatchObject({ statusCode: 429, code: 'rate_limited', retry_after_seconds: 40 });
    vi.advanceTimersByTime(40_001);
    expect(await statusOf(auth.sendOtp(PHONE, '2.2.2.2'))).toBe('ok');
  });

  it('the 429 carries a Retry-After header through the filter', async () => {
    const { auth } = stack(vi.fn(async () => okResponse()) as any);
    await auth.sendOtp(PHONE, '1.1.1.1');
    let error: any;
    try {
      await auth.sendOtp(PHONE, '1.1.1.1');
    } catch (e) {
      error = e;
    }
    const res: any = { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
    new RateLimitedFilter().catch(error, { switchToHttp: () => ({ getResponse: () => res }) } as any);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'rate_limited', retry_after_seconds: 60 }),
    );
  });

  it('per phone: 5 per hour', async () => {
    const { auth } = stack(vi.fn(async () => okResponse()) as any);
    for (let i = 0; i < SMS_LIMITS.phoneHour.max; i++) {
      expect(await statusOf(auth.sendOtp(PHONE, `9.9.9.${i}`))).toBe('ok');
      vi.advanceTimersByTime(61_000);
    }
    const body = await bodyOf(auth.sendOtp(PHONE, '9.9.9.99'));
    expect(body).toMatchObject({ statusCode: 429, code: 'rate_limited' });
    // freed when the oldest send leaves the hour window (sent at t=0, now t=305 s)
    expect(body.retry_after_seconds).toBe(Math.ceil((HOUR - 305_000) / 1000));
    vi.advanceTimersByTime(HOUR);
    expect(await statusOf(auth.sendOtp(PHONE, '9.9.9.99'))).toBe('ok');
  });

  it('per phone: 10 per day', async () => {
    const { auth } = stack(vi.fn(async () => okResponse()) as any);
    for (let i = 0; i < SMS_LIMITS.phoneDay.max; i++) {
      expect(await statusOf(auth.sendOtp(PHONE, `8.8.8.${i}`)), `send ${i}`).toBe('ok');
      // 5 sends per hour at most: after every 5th wait out the hour
      vi.advanceTimersByTime(i % 5 === 4 ? HOUR : 61_000);
    }
    const body = await bodyOf(auth.sendOtp(PHONE, '8.8.8.99'));
    expect(body).toMatchObject({ statusCode: 429, code: 'rate_limited' });
    expect(body.retry_after_seconds).toBeGreaterThan(20 * 3600);
    vi.advanceTimersByTime(24 * HOUR);
    expect(await statusOf(auth.sendOtp(PHONE, '8.8.8.99'))).toBe('ok');
  });

  it('per IP: 10 per 15 min, other IPs are unaffected', async () => {
    const { auth } = stack(vi.fn(async () => okResponse()) as any);
    for (let i = 0; i < SMS_LIMITS.ipWindow.max; i++) {
      expect(await statusOf(auth.sendOtp(phoneN(i), '5.5.5.5'))).toBe('ok');
    }
    const body = await bodyOf(auth.sendOtp(phoneN(50), '5.5.5.5'));
    expect(body).toMatchObject({ statusCode: 429, code: 'rate_limited' });
    expect(body.retry_after_seconds).toBe(15 * 60);
    expect(await statusOf(auth.sendOtp(phoneN(50), '6.6.6.6'))).toBe('ok');
    vi.advanceTimersByTime(15 * MIN + 1);
    expect(await statusOf(auth.sendOtp(phoneN(51), '5.5.5.5'))).toBe('ok');
  });

  it('per IP: 30 per day', async () => {
    const { auth } = stack(vi.fn(async () => okResponse()) as any);
    let n = 0;
    for (let batch = 0; batch < 3; batch++) {
      for (let i = 0; i < SMS_LIMITS.ipWindow.max; i++) {
        expect(await statusOf(auth.sendOtp(phoneN(n++), '7.7.7.7'))).toBe('ok');
      }
      vi.advanceTimersByTime(16 * MIN);
    }
    const body = await bodyOf(auth.sendOtp(phoneN(n), '7.7.7.7'));
    expect(body).toMatchObject({ statusCode: 429, code: 'rate_limited' });
    expect(body.retry_after_seconds).toBeGreaterThan(20 * 3600);
  });

  it('global daily ceiling from SMS_DAILY_CAP, warning at 70 %', async () => {
    vi.stubEnv('SMS_DAILY_CAP', '10');
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const { auth } = stack(vi.fn(async () => okResponse()) as any);
    for (let i = 0; i < 10; i++) {
      expect(await statusOf(auth.sendOtp(phoneN(i), `4.4.4.${i}`)), `send ${i}`).toBe('ok');
      if (i === 5) expect(warn).not.toHaveBeenCalled();
      if (i === 6) expect(warn).toHaveBeenCalledTimes(1);
    }
    // sms_daily warns at 70, 90 and 100 %, once each (SMS9).
    expect(warn).toHaveBeenCalledTimes(3);
    expect(warn.mock.calls[0][0]).toBe('sms_daily total=7 cap=10 pct=70');
    expect(await bodyOf(auth.sendOtp(phoneN(99), '4.4.4.99'))).toMatchObject({
      statusCode: 429,
      code: 'rate_limited',
    });
  });

  it('SMS_DAILY_CAP defaults to 1000 and ignores junk', () => {
    expect(smsDailyCap({} as any)).toBe(1000);
    expect(smsDailyCap({ SMS_DAILY_CAP: 'abc' } as any)).toBe(1000);
    expect(smsDailyCap({ SMS_DAILY_CAP: '-5' } as any)).toBe(1000);
    expect(smsDailyCap({ SMS_DAILY_CAP: '250' } as any)).toBe(250);
  });

  it('a rejection burns nothing: IP cap rejects, the phone and global slots stay free', async () => {
    const { auth, rateLimit } = stack(vi.fn(async () => okResponse()) as any);
    for (let i = 0; i < SMS_LIMITS.ipWindow.max; i++) await auth.sendOtp(phoneN(i), '5.5.5.5');
    const globalBefore = rateLimit.count('sms_global_day', 'all', 24 * HOUR);
    expect(await statusOf(auth.sendOtp(PHONE, '5.5.5.5'))).toBe(429);
    expect(rateLimit.count('sms_phone_cooldown', PHONE, MIN)).toBe(0);
    expect(rateLimit.count('sms_phone_hour', PHONE, HOUR)).toBe(0);
    expect(rateLimit.count('sms_ip_day', '5.5.5.5', 24 * HOUR)).toBe(SMS_LIMITS.ipWindow.max);
    expect(rateLimit.count('sms_global_day', 'all', 24 * HOUR)).toBe(globalBefore);
  });

  it('a rejection burns nothing: phone cap rejects, the IP and global slots stay free', async () => {
    const { auth, rateLimit } = stack(vi.fn(async () => okResponse()) as any);
    await auth.sendOtp(PHONE, '1.1.1.1');
    expect(await statusOf(auth.sendOtp(PHONE, '2.2.2.2'))).toBe(429);
    expect(rateLimit.count('sms_ip_window', '2.2.2.2', 15 * MIN)).toBe(0);
    expect(rateLimit.count('sms_ip_day', '2.2.2.2', 24 * HOUR)).toBe(0);
    expect(rateLimit.count('sms_global_day', 'all', 24 * HOUR)).toBe(1);
  });

  it('three phone spellings share the same keys', async () => {
    const { auth, rateLimit } = stack(vi.fn(async () => okResponse()) as any);
    await auth.sendOtp('+998 90 123 45 67', '1.1.1.1');
    expect(await statusOf(auth.sendOtp('998901234567', '2.2.2.2'))).toBe(429);
    expect(await statusOf(auth.sendOtp('+998-90-123-45-67', '3.3.3.3'))).toBe(429);
    expect(rateLimit.count('sms_phone_cooldown', PHONE, MIN)).toBe(1);
  });

  it('admin forgot-password has its own per-phone caps (IP and global shared) and keeps its admin ones', async () => {
    const { auth, admin, rateLimit } = stack(vi.fn(async () => okResponse()) as any);
    await admin.forgotPasswordSendOtp(PHONE, '1.1.1.1');
    await admin.settled();
    // 60 s cooldown on the same phone within the admin flow
    expect(await bodyOf(admin.forgotPasswordSendOtp(PHONE, '2.2.2.2'))).toMatchObject({
      statusCode: 429,
      code: 'rate_limited',
      retry_after_seconds: 60,
    });
    // the customer flow has its own phone budget: it is not blocked by the admin send
    expect(await statusOf(auth.sendOtp(PHONE, '3.3.3.3'))).toBe('ok');
    // the rejected call burned neither the admin keys nor the shared IP keys
    expect(rateLimit.count('admin_reset_send_ip', '2.2.2.2', HOUR)).toBe(0);
    expect(rateLimit.count('sms_ip_window', '2.2.2.2', 15 * MIN)).toBe(0);
    // the admin 3-per-15-min cap is still the stricter one
    vi.advanceTimersByTime(61_000);
    await admin.forgotPasswordSendOtp(PHONE, '1.1.1.1');
    await admin.settled();
    vi.advanceTimersByTime(61_000);
    await admin.forgotPasswordSendOtp(PHONE, '1.1.1.1');
    await admin.settled();
    vi.advanceTimersByTime(61_000);
    expect(await statusOf(admin.forgotPasswordSendOtp(PHONE, '1.1.1.1'))).toBe(429);
  });

  it('customer sends for a staff phone do not use up the staff reset budget', async () => {
    const { auth, admin } = stack(vi.fn(async () => okResponse()) as any);
    for (let i = 0; i < SMS_LIMITS.phoneDay.max; i++) {
      await auth.sendOtp(PHONE, `9.9.9.${i}`);
      vi.advanceTimersByTime(13 * MIN); // stays under the 5/h cap
    }
    expect(await statusOf(auth.sendOtp(PHONE, '9.9.9.99'))).toBe(429);
    expect(await statusOf(admin.forgotPasswordSendOtp(PHONE, '8.8.8.8'))).toBe('ok');
  });

  it('an unknown staff phone gives the global slot back but keeps the phone and IP slots', async () => {
    const { admin, rateLimit } = stack(vi.fn(async () => okResponse()) as any);
    const unknown = phoneN(5);
    await admin.forgotPasswordSendOtp(unknown, '7.7.7.7');
    await admin.settled();
    expect(rateLimit.count('sms_global_day', 'all', 24 * HOUR)).toBe(0);
    expect(rateLimit.count('admin_sms_phone_cooldown', unknown, MIN)).toBe(1);
    expect(rateLimit.count('sms_ip_day', '7.7.7.7', 24 * HOUR)).toBe(1);
  });
});

describe('SMS8: approved OTP text', () => {
  it('is the Eskiz-approved template byte for byte, nothing added', () => {
    expect(buildOtpMessage('123456')).toBe(
      'Kod dlya vhoda na platforme RentEvent: 123456. Nikomu ne soobshchayte etot kod.',
    );
  });

  it('is sent unchanged for both login and admin reset', async () => {
    vi.stubEnv('SMS_PROVIDER', 'mock');
    vi.stubEnv('NODE_ENV', 'test');
    const svc = new SmsService();
    await svc.sendOTP('998901234567', '123456');
    await svc.sendAdminOTP('998901234567', '123456');
    const log = svc.getDevOTPLog();
    expect(log).toHaveLength(2);
    for (const e of log) expect(e.message).toBe(buildOtpMessage('123456'));
    vi.unstubAllEnvs();
  });
});
