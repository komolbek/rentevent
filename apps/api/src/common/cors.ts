import type { CorsOptions, CorsOptionsDelegate } from '@nestjs/common/interfaces/external/cors-options.interface';

const DEFAULT_ADMIN_ORIGIN = 'https://admin.rentevent.uz';
// `next dev --port 3001` (apps/admin) and the preview-pane port from .claude/launch.json.
const LOCAL_ADMIN_ORIGINS = ['http://localhost:3001', 'http://localhost:3003'];

const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://rentevent.uz',
  'https://www.rentevent.uz',
  'https://admin.rentevent.uz',
  'https://api.rentevent.uz',
];

/** Origins allowed to call `/api/admin/*` with credentials. */
export function adminOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const origins = [env.ADMIN_ORIGIN?.trim() || DEFAULT_ADMIN_ORIGIN];
  if (env.NODE_ENV !== 'production') origins.push(...LOCAL_ADMIN_ORIGINS);
  return origins;
}

/** True for `/api/admin` paths; case-insensitive and tolerant of repeated slashes (Express routing is). */
export function isAdminPath(url: string | undefined): boolean {
  const path = (url ?? '').split('?')[0].toLowerCase().replace(/\/{2,}/g, '/');
  return path === '/api/admin' || path.startsWith('/api/admin/');
}

/**
 * Per-request CORS: the admin API answers only the admin origin(s), every other
 * route keeps the storefront allow-list (ALLOWED_ORIGINS). A disallowed origin
 * gets no Access-Control-Allow-Origin header. Requests without an Origin header
 * (iOS app, payment callbacks, curl) are not affected by CORS at all.
 */
export function createCorsDelegate(env: NodeJS.ProcessEnv = process.env): CorsOptionsDelegate<{ url?: string }> {
  const storefront = env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) || DEFAULT_ORIGINS;
  const admin = adminOrigins(env);
  return (req, callback) => {
    const isAdmin = isAdminPath(req.url);
    const options: CorsOptions = { origin: isAdmin ? admin : storefront, credentials: true };
    callback(null, options);
  };
}
