import { describe, expect, it } from 'vitest';
import { createCorsDelegate } from './cors';

function optionsFor(url: string, env: Record<string, string | undefined> = {}) {
  let result: any;
  createCorsDelegate(env as NodeJS.ProcessEnv)({ url }, (_err, opts) => {
    result = opts;
  });
  return result as { origin: string[]; credentials: boolean };
}

/** Mirrors the `cors` package: an origin is echoed only when it is in the list. */
const allowed = (opts: { origin: string[] }, origin: string) => opts.origin.includes(origin);

describe('createCorsDelegate', () => {
  const prod = { NODE_ENV: 'production' };

  it('admin routes: storefront origin gets no CORS, admin origin does', () => {
    const o = optionsFor('/api/admin/products', prod);
    expect(allowed(o, 'https://rentevent.uz')).toBe(false);
    expect(allowed(o, 'https://www.rentevent.uz')).toBe(false);
    expect(allowed(o, 'https://admin.rentevent.uz')).toBe(true);
    expect(o.credentials).toBe(true);
  });

  it('admin routes: query string and bare /api/admin are covered', () => {
    expect(allowed(optionsFor('/api/admin?x=1', prod), 'https://rentevent.uz')).toBe(false);
    expect(allowed(optionsFor('/api/admin/x?y=/api/', prod), 'https://rentevent.uz')).toBe(false);
  });

  it('local admin origin only outside production', () => {
    expect(allowed(optionsFor('/api/admin/x', prod), 'http://localhost:3003')).toBe(false);
    expect(allowed(optionsFor('/api/admin/x', { NODE_ENV: 'development' }), 'http://localhost:3003')).toBe(true);
  });

  it('ADMIN_ORIGIN overrides the default', () => {
    const o = optionsFor('/api/admin/x', { ...prod, ADMIN_ORIGIN: 'https://admin.example.uz' });
    expect(allowed(o, 'https://admin.example.uz')).toBe(true);
    expect(allowed(o, 'https://admin.rentevent.uz')).toBe(false);
  });

  it('storefront routes keep the existing allow-list', () => {
    const o = optionsFor('/api/products', prod);
    expect(allowed(o, 'https://rentevent.uz')).toBe(true);
    expect(allowed(o, 'https://evil.example')).toBe(false);
    const custom = optionsFor('/api/products', { ...prod, ALLOWED_ORIGINS: 'https://a.uz,https://b.uz' });
    expect(custom.origin).toEqual(['https://a.uz', 'https://b.uz']);
  });
});
