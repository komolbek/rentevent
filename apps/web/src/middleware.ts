import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ACCESS_COOKIE, verifyAccessToken } from '@/lib/gate';

const PROTECTED_ROUTES = [
  '/checkout',
  '/profile',
  '/favorites',
  '/orders',
];

function isGateEnabled(): boolean {
  const flag = process.env.SITE_GATE_ENABLED;
  return flag === 'true' || flag === '1';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isGateEnabled()) {
    const isExempt =
      pathname === '/coming-soon' ||
      pathname.startsWith('/api/access') ||
      pathname.startsWith('/_next/') ||
      pathname === '/favicon.ico' ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml' ||
      // Brand assets must stay reachable without the access cookie: browsers
      // fetch icons/manifest before any auth, and link-preview crawlers
      // (Telegram, Facebook, ...) request the OG image with no cookie at all.
      pathname === '/icon.svg' ||
      pathname === '/apple-icon.png' ||
      pathname === '/opengraph-image.png' ||
      pathname === '/manifest.webmanifest' ||
      pathname === '/icon-192.png' ||
      pathname === '/icon-512.png' ||
      pathname === '/icon-512-maskable.png';

    if (!isExempt) {
      const secret = process.env.SITE_ACCESS_SECRET;
      const token = request.cookies.get(ACCESS_COOKIE)?.value;
      const valid = secret ? await verifyAccessToken(token, secret) : false;

      if (!valid) {
        const url = request.nextUrl.clone();
        url.pathname = '/coming-soon';
        url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`;
        return NextResponse.rewrite(url);
      }
    }
  }

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    const loginUrl = new URL('/auth', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
