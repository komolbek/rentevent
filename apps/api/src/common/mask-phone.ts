/**
 * Masks a phone number for logs: keeps the `+998` prefix and the last two
 * digits (`+998*******67`). Anything too short to mask safely becomes `***`.
 */
export function maskPhone(phone: unknown): string {
  if (typeof phone !== 'string') return '***';
  const value = phone.trim();
  if (value.length < 8) return '***';
  const head = value.slice(0, 4);
  const tail = value.slice(-2);
  return `${head}${'*'.repeat(value.length - 6)}${tail}`;
}
