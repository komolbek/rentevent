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
  reactStrictMode: true,
  transpilePackages: ['@rentevent/types', '@rentevent/validators'],
  images: {
    remotePatterns: [
      // UploadThing only (what the admin upload returns); keeps /_next/image from being an open proxy.
      { protocol: 'https', hostname: '*.ufs.sh' },
      { protocol: 'https', hostname: 'utfs.io' },
    ],
  },
  async headers() {
    // Never let a browser/CDN serve a stale HTML shell after a deploy.
    // The default s-maxage=31536000 on prerendered pages could pin an old
    // document that references now-deleted, content-hashed JS chunks — those
    // 404, React never hydrates, and every button goes dead with no error.
    // Content-hashed assets under /_next/static stay immutable (excluded here).
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/((?!_next/static|_next/image).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
