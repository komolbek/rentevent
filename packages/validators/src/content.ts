/**
 * Rules for admin-managed home content (hero slides, inspirations).
 * Pure functions, no zod: shared by the API validators and, later, the admin UI.
 */

/**
 * Hosts the admin upload (UploadThing) serves images from. Keep in sync with
 * `images.remotePatterns` in apps/web and apps/admin `next.config.ts`
 * (`*.ufs.sh`, `utfs.io`): an image URL outside this list breaks next/image.
 */
export const UPLOAD_IMAGE_HOSTS = ['*.ufs.sh', 'utfs.io'] as const;

function hostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return UPLOAD_IMAGE_HOSTS.some((pattern) =>
    pattern.startsWith('*.') ? host.endsWith(pattern.slice(1)) && host.length > pattern.length - 1 : host === pattern,
  );
}

/** Absolute `https` URL on an upload host, no credentials. */
export function isAllowedImageUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && hostAllowed(u.hostname);
  } catch {
    return false;
  }
}

/** A single-slash relative path, or an http(s) URL. Rejects `javascript:`, `data:`, `//host`. */
export function isAllowedLinkUrl(value: string): boolean {
  if (/[\u0000-\u001f\u007f\s]/.test(value)) return false;
  if (value.startsWith('/')) return !value.startsWith('//') && !value.startsWith('/\\');
  try {
    const u = new URL(value);
    return (u.protocol === 'https:' || u.protocol === 'http:') && !!u.hostname;
  } catch {
    return false;
  }
}

export type HeroSlideStatus = 'hidden' | 'scheduled' | 'live' | 'ended';

/** Today's calendar day in Tashkent (UTC+5, no DST) as `YYYY-MM-DD`. */
export function tashkentToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 5 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * Admin badge for a slide. `startsAt` / `endsAt` are the `YYYY-MM-DD` strings the
 * admin API returns (inclusive, Tashkent days). Inactive wins over the schedule.
 */
export function heroSlideStatus(
  slide: { is_active: boolean; starts_at?: string | null; ends_at?: string | null },
  today: string = tashkentToday(),
): HeroSlideStatus {
  if (!slide.is_active) return 'hidden';
  if (slide.starts_at && today < slide.starts_at) return 'scheduled';
  if (slide.ends_at && today > slide.ends_at) return 'ended';
  return 'live';
}

/** Click position inside a preview box -> focal point, integer 0-100, clamped. */
export function focalFromClick(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }) {
  const pct = (v: number, start: number, size: number) =>
    size > 0 ? Math.min(100, Math.max(0, Math.round(((v - start) / size) * 100))) : 50;
  return { x: pct(clientX, rect.left, rect.width), y: pct(clientY, rect.top, rect.height) };
}

/** Body sent to the API: hero extras converted from form strings (empty -> null, focal -> integer). */
export function buildHeroBody(form: Record<string, string>, isActive: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = { ...form, is_active: isActive }
  for (const k of ['alt', 'image_key', 'mobile_image_url', 'mobile_image_key', 'starts_at', 'ends_at']) {
    body[k] = form[k]?.trim() ? form[k].trim() : null
  }
  for (const k of ['focal_x', 'focal_y']) body[k] = form[k] !== undefined && form[k] !== '' ? Number(form[k]) : null
  if (!body.mobile_image_url) body.mobile_image_key = null
  return body
}
