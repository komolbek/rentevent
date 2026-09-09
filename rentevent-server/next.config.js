/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '*.ufs.sh',
      },
      {
        protocol: 'https',
        hostname: 'utfs.io',
      },
    ],
  },
  // Enable experimental features for App Router
  experimental: {
    // Allow server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // CORS is handled dynamically in src/middleware.ts
  // to avoid the insecure Access-Control-Allow-Origin: * wildcard.

  // API versioning: /api/v1/* rewrites to /api/*
  // Clients should migrate to /api/v1/ prefix.
  // When v2 is needed, create new route files and add /api/v2/* rewrites.
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: '/api/:path*',
      },
    ]
  },
}

module.exports = nextConfig
