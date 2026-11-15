import { describe, expect, it } from 'vitest';
import { securityHeaders } from './security-headers';

function run(url: string, opts: { production: boolean; swagger: boolean }) {
  const headers: Record<string, string> = {};
  let removed = '';
  let nexted = false;
  const res: any = {
    setHeader: (k: string, v: string) => {
      headers[k] = v;
    },
    removeHeader: (k: string) => {
      removed = k;
    },
  };
  securityHeaders(opts)({ originalUrl: url, url } as any, res, () => {
    nexted = true;
  });
  return { headers, removed, nexted };
}

describe('securityHeaders', () => {
  it('sets the base headers, removes X-Powered-By and calls next', () => {
    const { headers, removed, nexted } = run('/api/products', { production: false, swagger: false });
    expect(nexted).toBe(true);
    expect(removed).toBe('X-Powered-By');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Referrer-Policy']).toBe('no-referrer');
    expect(headers['Cross-Origin-Resource-Policy']).toBe('same-site');
    expect(headers['Content-Security-Policy']).toBe("default-src 'none'; frame-ancestors 'none'");
  });

  it('sets HSTS only in production', () => {
    expect(run('/api/x', { production: false, swagger: false }).headers['Strict-Transport-Security']).toBeUndefined();
    expect(run('/api/x', { production: true, swagger: false }).headers['Strict-Transport-Security']).toBe(
      'max-age=31536000; includeSubDomains',
    );
  });

  it('skips CSP on /api/docs paths only when swagger is enabled', () => {
    for (const url of ['/api/docs', '/api/docs/', '/api/docs/swagger-ui.css', '/api/docs-json']) {
      const r = run(url, { production: false, swagger: true });
      expect(r.headers['Content-Security-Policy']).toBeUndefined();
      expect(r.headers['X-Content-Type-Options']).toBe('nosniff');
    }
    expect(run('/api/docs', { production: true, swagger: false }).headers['Content-Security-Policy']).toBeDefined();
    expect(run('/api/docsx', { production: false, swagger: true }).headers['Content-Security-Policy']).toBeDefined();
  });
});
