import { describe, expect, it } from 'vitest';
import {
  applyOtpBackspace,
  applyOtpInput,
  classifyOtpError,
  emptyOtp,
  resendSeconds,
} from './otp-input';

const err = (status: number, data: object = {}, headers: object = {}) => ({
  response: { status, data, headers },
});

describe('applyOtpInput', () => {
  it('autofill of 123456 into box 0 fills all six and completes', () => {
    const r = applyOtpInput(emptyOtp(), 0, '123456');
    expect(r.digits).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(r.complete).toBe(true);
  });

  it('a full code landing in a later box still fills from the first', () => {
    expect(applyOtpInput(emptyOtp(), 3, '123456').digits.join('')).toBe('123456');
  });

  it('ignores separators and extra digits', () => {
    expect(applyOtpInput(emptyOtp(), 0, '12 34-56 78').digits.join('')).toBe('123456');
  });

  it('a short paste fills from the box it landed in', () => {
    const r = applyOtpInput(emptyOtp(), 2, '987');
    expect(r.digits).toEqual(['', '', '9', '8', '7', '']);
    expect(r.focusIndex).toBe(5);
    expect(r.complete).toBe(false);
  });

  it('a short paste cannot overflow the last box', () => {
    const r = applyOtpInput(emptyOtp(), 4, '987');
    expect(r.digits).toEqual(['', '', '', '', '9', '8']);
  });

  it('one digit sets its box and moves right, last box stays', () => {
    expect(applyOtpInput(emptyOtp(), 1, '7')).toMatchObject({ focusIndex: 2, complete: false });
    expect(applyOtpInput(['1', '2', '3', '4', '5', ''], 5, '6')).toMatchObject({ focusIndex: 5, complete: true });
  });

  it('typing over a filled box keeps the new digit', () => {
    const cur = ['1', '', '', '', '', ''];
    expect(applyOtpInput(cur, 0, '12').digits[0]).toBe('2');
    expect(applyOtpInput(cur, 0, '21').digits[0]).toBe('2');
  });

  it('non-digits and emptied boxes', () => {
    expect(applyOtpInput(emptyOtp(), 0, 'abc').digits).toEqual(emptyOtp());
    const r = applyOtpInput(['1', '2', '', '', '', ''], 1, '');
    expect(r.digits[1]).toBe('');
    expect(r.focusIndex).toBe(1);
  });

  it('does not mutate its input', () => {
    const cur = emptyOtp();
    applyOtpInput(cur, 0, '123456');
    expect(cur).toEqual(emptyOtp());
  });
});

describe('applyOtpBackspace', () => {
  it('moves back and clears when the box is empty', () => {
    const r = applyOtpBackspace(['1', '2', '', '', '', ''], 2)!;
    expect(r.digits.slice(0, 2)).toEqual(['1', '']);
    expect(r.focusIndex).toBe(1);
  });
  it('does nothing on a filled box or the first box', () => {
    expect(applyOtpBackspace(['1', '', '', '', '', ''], 0)).toBeNull();
    expect(applyOtpBackspace(['1', '2', '', '', '', ''], 1)).toBeNull();
  });
});

describe('classifyOtpError', () => {
  it('maps the stable codes', () => {
    for (const code of ['invalid_phone', 'invalid_code', 'code_expired', 'sms_unavailable'] as const) {
      expect(classifyOtpError(err(400, { code })).kind).toBe(code);
    }
  });
  it('rate limited carries retry_after_seconds', () => {
    expect(classifyOtpError(err(429, { code: 'rate_limited', retry_after_seconds: 42 }))).toEqual({
      kind: 'rate_limited',
      retryAfter: 42,
    });
  });
  it('a 429 without a body falls back to the Retry-After header, then none', () => {
    expect(classifyOtpError(err(429, {}, { 'retry-after': '17' }))).toEqual({ kind: 'rate_limited', retryAfter: 17 });
    expect(classifyOtpError(err(429))).toEqual({ kind: 'rate_limited', retryAfter: undefined });
  });
  it('a 429 on verify is rate_limited, never invalid_code', () => {
    expect(classifyOtpError(err(429, { code: 'rate_limited', retry_after_seconds: 300 })).kind).not.toBe('invalid_code');
  });
  it('falls back to status when there is no code (admin reset, old API)', () => {
    expect(classifyOtpError(err(503)).kind).toBe('sms_unavailable');
    expect(classifyOtpError(err(400, { message: 'x' })).kind).toBe('invalid_code');
    expect(classifyOtpError(err(500)).kind).toBe('unknown');
  });
  it('no response means network', () => {
    expect(classifyOtpError(new Error('Network Error')).kind).toBe('network');
    expect(classifyOtpError(null).kind).toBe('network');
  });
});

describe('resendSeconds', () => {
  it('uses the server wait, else 60', () => {
    expect(resendSeconds(42)).toBe(42);
    expect(resendSeconds(undefined)).toBe(60);
    expect(resendSeconds(0)).toBe(60);
  });
});
