/**
 * Pure logic for the six-box verification code input and for turning an API
 * error into one of a few user-facing cases. Kept free of React so it is unit
 * tested. Same file lives in apps/admin/src/lib/otp-input.ts.
 */

export const OTP_LENGTH = 6;
export const DEFAULT_RESEND_SECONDS = 60;

export interface OtpInputResult {
  digits: string[];
  /** Box to focus next. */
  focusIndex: number;
  /** All boxes hold a digit. */
  complete: boolean;
}

export function emptyOtp(): string[] {
  return Array.from({ length: OTP_LENGTH }, () => '');
}

/**
 * Applies what arrived in box `index` (typing, autofill or paste) to the code.
 * - one digit: sets that box and moves on;
 * - several digits (autofill / paste): a full 6-digit code fills every box from
 *   the first, a shorter run fills from `index`; extra digits are dropped;
 * - a digit typed over a filled box keeps only the new one;
 * - an emptied box stays empty; non-digits are ignored.
 */
export function applyOtpInput(current: string[], index: number, raw: string): OtpInputResult {
  const digits = [...current];
  let clean = raw.replace(/\D/g, '');

  if (clean.length === 0) {
    digits[index] = '';
    return { digits, focusIndex: index, complete: digits.every(Boolean) };
  }

  // Typing over a filled box shows two characters: keep the new one.
  if (clean.length === 2 && digits[index]) {
    clean = clean[0] === digits[index] ? clean[1] : clean[0];
  }

  if (clean.length === 1) {
    digits[index] = clean;
    return {
      digits,
      focusIndex: Math.min(index + 1, OTP_LENGTH - 1),
      complete: digits.every(Boolean),
    };
  }

  const start = clean.length >= OTP_LENGTH ? 0 : index;
  const run = clean.slice(0, OTP_LENGTH - start);
  for (let i = 0; i < run.length; i++) digits[start + i] = run[i];
  return {
    digits,
    focusIndex: Math.min(start + run.length, OTP_LENGTH - 1),
    complete: digits.every(Boolean),
  };
}

/** Backspace in an empty box moves to the previous one and clears it. */
export function applyOtpBackspace(current: string[], index: number): OtpInputResult | null {
  if (current[index] || index === 0) return null;
  const digits = [...current];
  digits[index - 1] = '';
  return { digits, focusIndex: index - 1, complete: false };
}

export type OtpErrorKind =
  | 'invalid_phone'
  | 'invalid_code'
  | 'code_expired'
  | 'rate_limited'
  | 'sms_unavailable'
  | 'network'
  | 'unknown';

export interface ClassifiedOtpError {
  kind: OtpErrorKind;
  /** Seconds to wait, from `retry_after_seconds` (or `Retry-After`), when the API sent one. */
  retryAfter?: number;
}

function positiveInt(v: unknown): number | undefined {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.ceil(n) : undefined;
}

/**
 * Maps an axios-style error to a case. The stable `code` from the API wins;
 * without one (older responses, the admin reset) the HTTP status decides.
 */
export function classifyOtpError(error: unknown): ClassifiedOtpError {
  const res = (error as { response?: { status?: number; data?: any; headers?: any } } | null)?.response;
  if (!res) return { kind: 'network' };

  const data = res.data && typeof res.data === 'object' ? res.data : {};
  const retryAfter =
    positiveInt(data.retry_after_seconds) ?? positiveInt(res.headers?.['retry-after']);
  const code = typeof data.code === 'string' ? data.code : '';

  switch (code) {
    case 'invalid_phone':
    case 'invalid_code':
    case 'code_expired':
    case 'sms_unavailable':
      return { kind: code };
    case 'rate_limited':
      return { kind: 'rate_limited', retryAfter };
  }
  if (res.status === 429) return { kind: 'rate_limited', retryAfter };
  if (res.status === 503) return { kind: 'sms_unavailable' };
  if (res.status === 400) return { kind: 'invalid_code' };
  return { kind: 'unknown' };
}

/** Resend countdown: the server's wait when it gave one, else 60 s. */
export function resendSeconds(retryAfter?: number): number {
  return retryAfter && retryAfter > 0 ? retryAfter : DEFAULT_RESEND_SECONDS;
}
