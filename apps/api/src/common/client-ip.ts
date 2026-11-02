import type { Request } from 'express';

/**
 * The caller's IP for rate limiting. Behind Railway's edge proxy the last
 * X-Forwarded-For entry is the one the proxy itself appended; earlier
 * entries come from the client and can be forged.
 */
export function clientIp(req: Request): string {
  const header = req.headers['x-forwarded-for'];
  const value = Array.isArray(header) ? header[header.length - 1] : header;
  const last = value?.split(',').pop()?.trim();
  return last || req.ip || 'unknown';
}
