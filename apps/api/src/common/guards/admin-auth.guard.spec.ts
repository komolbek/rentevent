import { beforeAll, describe, expect, it } from 'vitest';
import { createAdminSession, validateAdminSession } from './admin-auth.guard';

describe('validateAdminSession', () => {
  beforeAll(() => {
    process.env.ADMIN_SESSION_SECRET = 'test-secret';
  });

  it('accepts a session it issued', () => {
    const token = createAdminSession('staff-1');
    expect(validateAdminSession(token)).toEqual({ valid: true, staffId: 'staff-1' });
  });

  it('rejects a correct-length forged signature', () => {
    const token = `staff:staff-1:${Date.now()}:${'a'.repeat(64)}`;
    expect(validateAdminSession(token)).toEqual({ valid: false });
  });

  it('rejects a wrong-length signature instead of throwing', () => {
    const token = `staff:staff-1:${Date.now()}:deadbeef`;
    expect(() => validateAdminSession(token)).not.toThrow();
    expect(validateAdminSession(token)).toEqual({ valid: false });
  });

  it('rejects a tampered payload signed for a different staff id', () => {
    const [prefix, , timestamp, signature] = createAdminSession('staff-1').split(':');
    const token = `${prefix}:staff-2:${timestamp}:${signature}`;
    expect(validateAdminSession(token)).toEqual({ valid: false });
  });

  it('rejects an expired session', () => {
    const stale = Date.now() - 25 * 60 * 60 * 1000;
    const token = `staff:staff-1:${stale}:${'a'.repeat(64)}`;
    expect(validateAdminSession(token)).toEqual({ valid: false });
  });

  it('rejects malformed tokens', () => {
    expect(validateAdminSession('')).toEqual({ valid: false });
    expect(validateAdminSession('not:enough:parts')).toEqual({ valid: false });
    expect(validateAdminSession('user:staff-1:123:sig')).toEqual({ valid: false });
  });
});
