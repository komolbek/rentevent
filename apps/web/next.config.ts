import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

// Report-Only until checked in a browser; then switch the key to Content-Security-Policy.
function contentSecurityPolicy(): string {
  let apiOrigin = '';
  try {
    if (process.env.NEXT_PUBLIC_API_URL) apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL).origin;
  } catch {
    // relative or invalid URL: 'self' covers it
  }
  const connect = ["'self'", apiOrigin, 'https://*.ufs.sh', 'https://utfs.io', isProd ? '' : 'ws:'];
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.ufs.sh https://utfs.io",
    `connect-src ${connect.filter(Boolean).join(' ')}`,
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ');
}

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  ...(isProd ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
  { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy() },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@rentevent/types', '@rentevent/validators'],
  // Local-only proxy so a dev server can read the production API without
  // tripping its CORS allow-list. Inert unless DEV_API_PROXY_TARGET is set.
  async rewrites() {
    const target = process.env.DEV_API_PROXY_TARGET;
    if (!target) return [];
    return [{ source: '/api-proxy/:path*', destination: `${target}/:path*` }];
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
