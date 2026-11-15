/**
 * Canonical Uzbek phone number: `+998` + 9 digits (same as `^\+998\d{9}$` in
 * `packages/validators`, the admin staff form and the stored `Staff.phoneNumber`).
 * Accepts `+998 90 123 45 67`, `998901234567`, `+998-90-123-45-67`, `(998) 90 ...`.
 * Returns null when the input is not a valid number.
 */
export function normalizeUzPhone(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 32) return null;
  const cleaned = raw.trim().replace(/^\+/, '').replace(/[\s\-()]/g, '');
  return /^998\d{9}$/.test(cleaned) ? `+${cleaned}` : null;
}
