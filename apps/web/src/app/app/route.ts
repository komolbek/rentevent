import { NextResponse, type NextRequest } from 'next/server';

// Server-side API base: the same env the client uses, else production.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.rentevent.uz/api';

/**
 * The address the home page QR code encodes: one code for both phones.
 * iOS goes to the App Store link, Android to Google Play (both set in admin →
 * Настройки); anything else — or a store link that is not set yet — lands
 * on the website.
 */
export async function GET(request: NextRequest) {
  let appStoreUrl = '';
  let playStoreUrl = '';
  try {
    const res = await fetch(`${API_URL}/business/info`, { next: { revalidate: 600 } });
    const body = await res.json();
    appStoreUrl = body?.data?.appStoreUrl ?? '';
    playStoreUrl = body?.data?.playStoreUrl ?? '';
  } catch {
    // API down: the website is still a useful destination.
  }

  const ua = request.headers.get('user-agent') ?? '';
  const target =
    /iPhone|iPad|iPod/i.test(ua) && appStoreUrl
      ? appStoreUrl
      : /Android/i.test(ua) && playStoreUrl
        ? playStoreUrl
        : new URL('/', request.url).toString();

  return NextResponse.redirect(target, 302);
}
