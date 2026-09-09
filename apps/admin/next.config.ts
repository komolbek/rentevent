import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@rentevent/types', '@rentevent/validators'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    // Never let a browser/CDN serve a stale HTML shell after a deploy.
    // The default s-maxage=31536000 on prerendered pages could pin an old
    // document that references now-deleted, content-hashed JS chunks — those
    // 404, React never hydrates, and every button goes dead with no error.
    // Content-hashed assets under /_next/static stay immutable (excluded here).
    return [
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
