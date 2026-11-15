import { NextResponse } from 'next/server';
import { ACCESS_COOKIE, ACCESS_TTL_MS, codeMatches, signAccessToken } from '@/lib/gate';

import {
  GATE_MAX_FAILURES,
  GATE_WINDOW_MS,
  clientIpFromHeaders,
  createFailureLimiter,
} from '@/lib/gate-rate-limit';

export const runtime = 'edge';

// Every attempt counts when it starts; a correct code is taken back.
const limiter = createFailureLimiter({ max: GATE_MAX_FAILURES, windowMs: GATE_WINDOW_MS });

export async function POST(req: Request) {
  const expected = process.env.SITE_ACCESS_CODE;
  const secret = process.env.SITE_ACCESS_SECRET;

  if (!expected || !secret) {
    return NextResponse.json({ ok: false, error: 'gate_not_configured' }, { status: 500 });
  }

  const ip = clientIpFromHeaders(req.headers);
  const wait = limiter.retryAfter(ip);
  if (wait > 0) {
    return NextResponse.json(
      { ok: false, error: 'too_many_attempts' },
      { status: 429, headers: { 'Retry-After': String(wait) } },
    );
  }

  // Record the attempt before any await so parallel guesses cannot all pass the check
  // above; a correct code undoes it below.
  limiter.recordFailure(ip);

  let body: { code?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!code) return NextResponse.json({ ok: false }, { status: 400 });

  const ok = await codeMatches(secret, code, expected);
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'invalid_code' }, { status: 401 });
  }
  limiter.undoLast(ip);

  const token = await signAccessToken(secret, ACCESS_TTL_MS);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACCESS_COOKIE, token, {
    path: '/',
    maxAge: Math.floor(ACCESS_TTL_MS / 1000),
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
  });
  return res;
}
