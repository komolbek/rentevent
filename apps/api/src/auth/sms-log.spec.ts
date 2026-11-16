import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import {
  DailyThresholds,
  formatSmsBlocked,
  formatSmsDaily,
  formatSmsSend,
  hashIp,
  safeToken,
} from './sms-log';
import { SmsService, buildOtpMessage } from './sms.service';
import { SmsQuotaService } from './sms-quota.service';
import { RateLimitService } from '../common/rate-limit.service';

// Deliberately recognizable fakes: none of these may ever appear in a log line.
const PHONE = '+998901234567';
const FULL_DIGITS = '901234567';
const CODE = '424242';
const KEY = 'KEY-SECRET-XYZ';
const URL_Q = 'https://gw.example.test/api/v1?token=URLTOKEN';
const MASKED = '+998*******67';

describe('sms log formatters', () => {
  it('ok send: exact line', () => {
    expect(
      formatSmsSend({ purpose: 'login', provider: 'gateway', ok: true, ms: 312.4, messageId: 'abc-123', status: '200', phone: PHONE }),
    ).toBe(`sms_send purpose=login provider=gateway ok=true ms=312 msgId=abc-123 status=200 phone=${MASKED}`);
  });

  it('failed send: exact line, no message id', () => {
    expect(
      formatSmsSend({ purpose: 'admin_reset', provider: 'gateway', ok: false, ms: 8001, status: 'timeout', phone: PHONE }),
    ).toBe(`sms_send purpose=admin_reset provider=gateway ok=false ms=8001 msgId=- status=timeout phone=${MASKED}`);
  });

  it.each(['timeout', 'network', 'http_429', 'http_5xx', 'breaker_open', 'quota', 'config'])(
    'status class %s',
    (status) => {
      const line = formatSmsSend({ purpose: 'login', provider: 'gateway', ok: false, ms: 1, status, phone: PHONE });
      expect(line).toContain(` status=${status} `);
    },
  );

  it('blocked: exact lines, ip only as a hash for ip reasons', () => {
    expect(formatSmsBlocked({ reason: 'phone_cooldown', purpose: 'login', phone: PHONE, ip: '1.2.3.4' })).toBe(
      `sms_blocked reason=phone_cooldown purpose=login phone=${MASKED}`,
    );
    const ipLine = formatSmsBlocked({ reason: 'ip_15m', purpose: 'admin_reset', phone: PHONE, ip: '1.2.3.4' });
    expect(ipLine).toBe(`sms_blocked reason=ip_15m purpose=admin_reset phone=${MASKED} ip=${hashIp('1.2.3.4')}`);
    expect(ipLine).not.toContain('1.2.3.4');
    expect(hashIp('1.2.3.4')).toMatch(/^[0-9a-f]{8}$/);
  });

  it('daily line', () => {
    expect(formatSmsDaily(500, 1000)).toBe('sms_daily total=500 cap=1000 pct=50');
    expect(formatSmsDaily(1000, 1000)).toBe('sms_daily total=1000 cap=1000 pct=100');
  });

  it('untrusted ids are sanitized', () => {
    expect(safeToken('ok_1-2')).toBe('ok_1-2');
    expect(safeToken('a b\nfake_line=1')).toBe('-');
    expect(safeToken(undefined)).toBe('-');
  });

  it('output never contains code, full phone, text or key', () => {
    const lines = [
      formatSmsSend({ purpose: 'login', provider: 'gateway', ok: true, ms: 5, messageId: 'id1', status: '200', phone: PHONE }),
      formatSmsSend({ purpose: 'login', provider: 'gateway', ok: false, ms: 5, status: 'http_5xx', phone: PHONE }),
      formatSmsBlocked({ reason: 'ip_day', purpose: 'login', phone: PHONE, ip: '9.9.9.9' }),
      formatSmsDaily(3, 10),
    ].join('\n');
    for (const secret of [CODE, PHONE, FULL_DIGITS, KEY, 'URLTOKEN', buildOtpMessage(CODE), 'Nikomu', '9.9.9.9']) {
      expect(lines).not.toContain(secret);
    }
  });
});

describe('daily thresholds fire once per day', () => {
  it('50 / 70 / 90 / 100 %', () => {
    const t = new DailyThresholds();
    const day = new Date('2026-11-16T10:00:00Z');
    expect(t.crossed(499, 1000, day)).toBeNull();
    expect(t.crossed(500, 1000, day)).toBe(50);
    expect(t.crossed(501, 1000, day)).toBeNull();
    expect(t.crossed(700, 1000, day)).toBe(70);
    expect(t.crossed(900, 1000, day)).toBe(90);
    expect(t.crossed(1000, 1000, day)).toBe(100);
    // refund then cross again the same day: silent
    expect(t.crossed(499, 1000, day)).toBeNull();
    expect(t.crossed(500, 1000, day)).toBeNull();
  });

  it('fires again the next day', () => {
    const t = new DailyThresholds();
    expect(t.crossed(500, 1000, new Date('2026-11-16T23:00:00Z'))).toBe(50);
    expect(t.crossed(500, 1000, new Date('2026-11-17T00:10:00Z'))).toBe(50);
  });
});

describe('wired into the send path', () => {
  let lines: string[];
  const env = { ...process.env };
  beforeEach(() => {
    lines = [];
    const grab = (m: unknown) => lines.push(String(m));
    vi.spyOn(Logger.prototype, 'log').mockImplementation(grab);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(grab);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(grab);
    process.env.SMS_PROVIDER = 'gateway';
    process.env.SMS_GATEWAY_URL = URL_Q;
    process.env.SMS_GATEWAY_API_KEY = KEY;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.env = { ...env };
  });

  it('logs an ok send with the gateway message id and nothing secret', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ status: 'sent', id: 'gw-777' }) })));
    const r = await new SmsService().sendOTP(PHONE, CODE);
    expect(r.messageId).toBe('gw-777');
    const out = lines.join('\n');
    expect(out).toMatch(/^sms_send purpose=login provider=gateway ok=true ms=\d+ msgId=gw-777 status=200 phone=\+998\*{7}67$/m);
    for (const s of [CODE, PHONE, KEY, 'URLTOKEN', 'Nikomu']) expect(out).not.toContain(s);
  });

  it('logs failure classes for admin reset', async () => {
    const svc = new SmsService();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })));
    await svc.sendAdminOTP(PHONE, CODE);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) })));
    await svc.sendAdminOTP(PHONE, CODE);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error(`boom ${KEY}`); }));
    await svc.sendAdminOTP(PHONE, CODE);
    const out = lines.join('\n');
    expect(out).toMatch(/purpose=admin_reset provider=gateway ok=false ms=\d+ msgId=- status=http_5xx/);
    expect(out).toMatch(/status=http_429/);
    expect(out).toMatch(/status=network/);
    expect(out).not.toContain(KEY);
  });

  it('mock in production prints no code and reports config', async () => {
    process.env.SMS_PROVIDER = 'mock';
    process.env.NODE_ENV = 'production';
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await new SmsService().sendOTP(PHONE, CODE);
    expect(spy).not.toHaveBeenCalled();
    expect(lines.join('\n')).toMatch(/provider=mock ok=false .*status=config/);
    expect(lines.join('\n')).not.toContain(CODE);
  });

  it('quota rejection logs sms_blocked; crossing 50 % logs sms_daily once', () => {
    process.env.SMS_DAILY_CAP = '10';
    const quota = new SmsQuotaService(new RateLimitService());
    for (let i = 0; i < 5; i++) quota.reserve(`+99890000000${i}`, `10.0.0.${i}`);
    expect(lines.filter((l) => l.startsWith('sms_daily'))).toEqual(['sms_daily total=5 cap=10 pct=50']);
    expect(() => quota.reserve('+998900000000', '10.0.0.9')).toThrow();
    expect(lines).toContain('sms_blocked reason=phone_cooldown purpose=login phone=+998*******00');
  });
});
