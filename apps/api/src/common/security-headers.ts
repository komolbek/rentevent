import type { NextFunction, Request, Response } from 'express';

const API_CSP = "default-src 'none'; frame-ancestors 'none'";

export interface SecurityHeadersOptions {
  /** Adds Strict-Transport-Security. */
  production: boolean;
  /** Swagger UI needs inline scripts and styles, so it gets no CSP. */
  swagger: boolean;
}

/** Hand-written replacement for helmet (no new dependency): headers for a JSON-only API. */
export function securityHeaders(opts: SecurityHeadersOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    if (opts.production) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    const isDocs = opts.swagger && /^\/api\/docs(?:[/?-]|$)/.test(req.originalUrl || req.url);
    if (!isDocs) res.setHeader('Content-Security-Policy', API_CSP);
    next();
  };
}
