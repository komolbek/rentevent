import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { maskPhone } from './mask-phone';
import { SmsService } from '../auth/sms.service';

describe('maskPhone', () => {
  it('keeps the prefix and last two digits', () => {
    expect(maskPhone('+998901234567')).toBe('+998*******67');
  });

  it('never returns the original middle digits', () => {
    expect(maskPhone('+998901234567')).not.toContain('0123');
  });

  it('masks short or non-string input fully', () => {
    expect(maskPhone('12345')).toBe('***');
    expect(maskPhone(undefined)).toBe('***');
    expect(maskPhone(null)).toBe('***');
  });
});

describe('SmsService with SMS_PROVIDER=mock', () => {
  const saved = { p: process.env.SMS_PROVIDER, e: process.env.NODE_ENV };
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env.SMS_PROVIDER = 'mock';
    log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (saved.p === undefined) delete process.env.SMS_PROVIDER;
    else process.env.SMS_PROVIDER = saved.p;
    process.env.NODE_ENV = saved.e;
  });

  it('in production: logs a startup error, prints no code, stores none, reports failure', async () => {
    process.env.NODE_ENV = 'production';
    const sms = new SmsService();
    const err = vi.spyOn((sms as any).logger, 'error').mockImplementation(() => undefined);
    sms.onModuleInit();
    expect(err).toHaveBeenCalledTimes(1);

    const res = await sms.sendOTP('+998901234567', '123456');
    expect(res.success).toBe(false);
    expect(log).not.toHaveBeenCalled();
    expect(sms.getDevOTPLog()).toHaveLength(0);
    expect(sms.isMockMode()).toBe(false);
  });

  it('outside production: logs a masked phone and keeps the dev entry', async () => {
    process.env.NODE_ENV = 'development';
    const sms = new SmsService();
    const res = await sms.sendOTP('+998901234567', '123456');
    expect(res.success).toBe(true);
    const printed = String(log.mock.calls[0][0]);
    expect(printed).toContain('+998*******67');
    expect(printed).not.toContain('+998901234567');
    expect(sms.getDevOTPLog()).toHaveLength(1);
  });
});
