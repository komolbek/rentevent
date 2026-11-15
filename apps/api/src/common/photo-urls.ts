import { BadRequestException } from '@nestjs/common';

/** Max photos on a review or a return request. */
export const MAX_USER_PHOTOS = 10;
const MAX_URL_LENGTH = 500;

/**
 * UploadThing file hosts: `https://<appId>.ufs.sh/f/<key>` (v7, `ufsUrl`) and the
 * legacy `https://utfs.io/f/<key>`. These are what `AdminUploadService` returns.
 */
export function isUploadThingUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > MAX_URL_LENGTH) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  return host === 'utfs.io' || (host.endsWith('.ufs.sh') && host.length > '.ufs.sh'.length);
}

/**
 * Validates a user-supplied photo list: an array of at most `MAX_USER_PHOTOS`
 * https UploadThing URLs. Returns the list; throws 400 otherwise.
 */
export function assertPhotoUrls(photos: unknown): string[] {
  if (photos === undefined || photos === null) return [];
  if (!Array.isArray(photos)) {
    throw new BadRequestException('photos must be an array of URLs');
  }
  if (photos.length > MAX_USER_PHOTOS) {
    throw new BadRequestException(`At most ${MAX_USER_PHOTOS} photos are allowed`);
  }
  if (!photos.every(isUploadThingUrl)) {
    throw new BadRequestException('photos must be https URLs of uploaded images');
  }
  return photos;
}
