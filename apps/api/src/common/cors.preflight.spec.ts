import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCorsDelegate } from './cors';

// Same `cors` + `express` that Nest's platform-express uses behind `app.enableCors(...)`.
const req = createRequire(require.resolve('@nestjs/platform-express'));
const cors = req('cors');
const express = req('express');

let server: Server;
let base: string;

beforeAll(async () => {
  const app = express();
  app.use(cors(createCorsDelegate({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)));
  app.all('/api/*splat', (_req: any, res: any) => res.json({ ok: true }));
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

async function preflight(path: string, origin: string) {
  const res = await fetch(base + path, {
    method: 'OPTIONS',
    headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' },
  });
  return {
    allowOrigin: res.headers.get('access-control-allow-origin'),
    credentials: res.headers.get('access-control-allow-credentials'),
  };
}

describe('CORS preflight over HTTP', () => {
  it('/api/admin/*: storefront origin gets no Access-Control-Allow-Origin', async () => {
    for (const path of ['/api/admin/products', '/API/Admin/products', '//api//admin/x', '/api/admin?x=1']) {
      expect((await preflight(path, 'https://rentevent.uz')).allowOrigin).toBeNull();
    }
  });

  it('/api/admin/*: admin origin is echoed with credentials', async () => {
    const r = await preflight('/api/admin/products', 'https://admin.rentevent.uz');
    expect(r.allowOrigin).toBe('https://admin.rentevent.uz');
    expect(r.credentials).toBe('true');
  });

  it('storefront routes unchanged', async () => {
    expect((await preflight('/api/products', 'https://rentevent.uz')).allowOrigin).toBe('https://rentevent.uz');
    expect((await preflight('/api/products', 'https://evil.example')).allowOrigin).toBeNull();
  });
});
