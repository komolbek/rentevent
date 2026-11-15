import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import {
  AdminUploadService,
  MAX_UPLOAD_BYTES,
  detectImageMime,
} from './admin-upload.service';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
]);

const file = (buffer: Buffer, originalname = 'a.jpg', mimetype = 'image/jpeg') => ({
  buffer,
  originalname,
  mimetype,
  size: buffer.length,
});

describe('detectImageMime', () => {
  it('detects jpeg, png, webp', () => {
    expect(detectImageMime(JPEG)).toBe('image/jpeg');
    expect(detectImageMime(PNG)).toBe('image/png');
    expect(detectImageMime(WEBP)).toBe('image/webp');
  });

  it('rejects text, svg, gif and empty input', () => {
    expect(detectImageMime(Buffer.from('hello world, not an image'))).toBeNull();
    expect(
      detectImageMime(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),
    ).toBeNull();
    expect(detectImageMime(Buffer.from('GIF89a......'))).toBeNull();
    expect(detectImageMime(Buffer.alloc(0))).toBeNull();
  });
});

describe('AdminUploadService.uploadImage', () => {
  let service: AdminUploadService;
  let uploadFiles: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new AdminUploadService();
    uploadFiles = vi.fn().mockResolvedValue({
      data: { ufsUrl: 'https://x.ufs.sh/f/k', key: 'k' },
    });
    (service as any).utapi = { uploadFiles };
  });

  it('rejects files over 10 MB', async () => {
    const big = Buffer.concat([JPEG, Buffer.alloc(11 * 1024 * 1024)]);
    expect(big.length).toBeGreaterThan(MAX_UPLOAD_BYTES);
    await expect(service.uploadImage(file(big))).rejects.toBeInstanceOf(
      PayloadTooLargeException,
    );
    expect(uploadFiles).not.toHaveBeenCalled();
  });

  it('rejects a .txt renamed to .jpg with an image MIME', async () => {
    await expect(
      service.uploadImage(file(Buffer.from('plain text'), 'notes.jpg')),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(uploadFiles).not.toHaveBeenCalled();
  });

  it.each([
    ['jpeg', JPEG, 'image/jpeg'],
    ['png', PNG, 'image/png'],
    ['webp', WEBP, 'image/webp'],
  ])('accepts a real %s and uses the detected type', async (_n, buf, mime) => {
    const res = await service.uploadImage(
      file(buf, 'photo.bin', 'application/octet-stream'),
    );
    expect(res).toEqual({ url: 'https://x.ufs.sh/f/k', key: 'k' });
    const sent = uploadFiles.mock.calls[0][0] as File;
    expect(sent.type).toBe(mime);
  });

  it('rejects a missing file', async () => {
    await expect(service.uploadImage(undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
