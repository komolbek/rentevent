import { normalizeUzPhone } from '../common/phone';

/** At most this many phones may be test phones in production (one App Review account, one spare). */
export const MAX_PROD_TEST_PHONES = 2;

export class TestAuthConfigError extends Error {}

export interface TestAuthConfig {
  enabled: boolean;
  /** Canonical `+998XXXXXXXXX`. Empty when disabled. */
  phones: string[];
  /** The fixed code. Never log it. Empty when disabled. */
  code: string;
}

const DISABLED: TestAuthConfig = { enabled: false, phones: [], code: '' };

/**
 * Reads ENABLE_TEST_AUTH / TEST_PHONE_NUMBERS / TEST_OTP_CODE. Phones are written
 * `998XXXXXXXXX` (no `+`) and normalized with the shared normalizer. In production
 * (when enabled) the list has at most 2 phones and the code is exactly 6 digits;
 * a malformed entry throws in every environment. Error messages never contain the code.
 */
export function parseTestAuthConfig(env: NodeJS.ProcessEnv = process.env): TestAuthConfig {
  if (env.ENABLE_TEST_AUTH !== 'true') return DISABLED;

  const raw = (env.TEST_PHONE_NUMBERS ?? '').split(',').map((p) => p.trim()).filter(Boolean);
  const phones: string[] = [];
  for (const entry of raw) {
    const normalized = normalizeUzPhone(entry);
    if (!normalized) {
      throw new TestAuthConfigError(
        'TEST_PHONE_NUMBERS has a malformed entry: use 998XXXXXXXXX (no +), comma separated',
      );
    }
    if (!phones.includes(normalized)) phones.push(normalized);
  }

  const code = env.TEST_OTP_CODE ?? '';
  if (env.NODE_ENV === 'production') {
    if (phones.length === 0) {
      throw new TestAuthConfigError('ENABLE_TEST_AUTH=true needs at least one phone in TEST_PHONE_NUMBERS');
    }
    if (phones.length > MAX_PROD_TEST_PHONES) {
      throw new TestAuthConfigError(
        `TEST_PHONE_NUMBERS may hold at most ${MAX_PROD_TEST_PHONES} phones in production`,
      );
    }
    if (!/^\d{6}$/.test(code)) {
      throw new TestAuthConfigError('TEST_OTP_CODE must be exactly 6 digits in production');
    }
  }
  return { enabled: true, phones, code };
}
