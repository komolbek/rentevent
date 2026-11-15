import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { UTApi } from 'uploadthing/server';

/** Max admin image size; multer rejects larger bodies with 413. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Detects jpeg/png/webp from the file's magic bytes (client MIME and file
 * name are ignored). Returns the real MIME type, or null. SVG, GIF, HEIC and
 * everything else are not accepted.
 */
export function detectImageMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return 'image/png';
  }
  if (
    buf.length >= 12 &&
    buf.toString('latin1', 0, 4) === 'RIFF' &&
    buf.toString('latin1', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

interface MulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class AdminUploadService {
  private readonly logger = new Logger(AdminUploadService.name);
  // Reads UPLOADTHING_TOKEN from the environment.
  private readonly utapi = new UTApi();

  async uploadImage(file?: MulterFile) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No image file provided');
    }

    if (file.buffer.length > MAX_UPLOAD_BYTES) {
      throw new PayloadTooLargeException('Image is larger than 10 MB');
    }

    const mime = detectImageMime(file.buffer);
    if (!mime) {
      throw new BadRequestException('Only JPEG, PNG and WebP images are allowed');
    }

    // Name and type come from the detected format, not from the client.
    const ext = mime === 'image/jpeg' ? 'jpg' : mime.slice('image/'.length);
    const base = (file.originalname || 'image').replace(/\.[^.]*$/, '').slice(0, 100);
    const upload = new File([file.buffer], `${base || 'image'}.${ext}`, {
      type: mime,
    });

    try {
      const result = await this.utapi.uploadFiles(upload);
      if (result.error || !result.data) {
        this.logger.error(
          `UploadThing upload failed: ${JSON.stringify(result.error)}`,
        );
        throw new InternalServerErrorException('Image upload failed');
      }

      // v7 exposes `ufsUrl`; `url` is kept for backwards compatibility.
      const data = result.data as { ufsUrl?: string; url?: string; key: string };
      return { url: data.ufsUrl || data.url, key: data.key };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Image upload error: ${String(err)}`);
      throw new InternalServerErrorException('Image upload failed');
    }
  }
}
