import { describe, expect, it } from 'vitest';
import { normalizeUzPhone } from './phone';

describe('normalizeUzPhone', () => {
  it('maps every spelling of one number to the same value', () => {
    const spellings = [
      '+998 90 123 45 67',
      '998901234567',
      '+998-90-123-45-67',
      ' +998 (90) 123-45-67 ',
    ];
    for (const s of spellings) {
      expect(normalizeUzPhone(s)).toBe('+998901234567');
    }
  });

  it('rejects invalid input', () => {
    for (const s of ['', '123', '901234567', '+99890123456', '9989012345678', 'abc', '+998 90 12a 45 67']) {
      expect(normalizeUzPhone(s)).toBeNull();
    }
    expect(normalizeUzPhone(undefined)).toBeNull();
    expect(normalizeUzPhone(998901234567)).toBeNull();
    expect(normalizeUzPhone({})).toBeNull();
  });
});
