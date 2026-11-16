import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { AdminDevOtpController, devOtpControllers } from './admin-dev-otp.controller';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function serve(controllers: any[]): Promise<{ app: INestApplication; base: string }> {
  const mod = await Test.createTestingModule({ controllers }).compile();
  const app = mod.createNestApplication();
  app.setGlobalPrefix('api');
  await app.listen(0, '127.0.0.1');
  return { app, base: await app.getUrl() };
}

describe('dev OTP viewer registration (S15)', () => {
  it('is registered only in development and test', () => {
    expect(devOtpControllers('development')).toEqual([AdminDevOtpController]);
    expect(devOtpControllers('test')).toEqual([AdminDevOtpController]);
    for (const env of ['production', 'staging', '', undefined]) {
      expect(devOtpControllers(env)).toEqual([]);
    }
  });

  it('AdminModule has no dev-otp controller under NODE_ENV=production, even with SMS_PROVIDER=mock', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SMS_PROVIDER', 'mock');
    vi.resetModules();
    const { AdminModule } = await import('./admin.module');
    const { AdminDevOtpController: Ctl } = await import('./admin-dev-otp.controller');
    const registered: unknown[] = Reflect.getMetadata('controllers', AdminModule);
    expect(registered).not.toContain(Ctl);
  });

  it('AdminModule registers it under NODE_ENV=test', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.resetModules();
    const { AdminModule } = await import('./admin.module');
    const { AdminDevOtpController: Ctl } = await import('./admin-dev-otp.controller');
    expect(Reflect.getMetadata('controllers', AdminModule)).toContain(Ctl);
  });

  it('GET /api/admin/dev-otp is 404 with NODE_ENV=production and SMS_PROVIDER=mock', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SMS_PROVIDER', 'mock');
    const { app, base } = await serve(devOtpControllers(process.env.NODE_ENV));
    try {
      expect((await fetch(`${base}/api/admin/dev-otp`)).status).toBe(404);
      expect((await fetch(`${base}/api/admin/dev-otp`, { method: 'DELETE' })).status).toBe(404);
    } finally {
      await app.close();
    }
  });
});
