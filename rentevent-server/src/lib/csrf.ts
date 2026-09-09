import { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import { serialize, parse } from 'cookie'

const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_TOKEN_LENGTH = 32

/**
 * Generate a cryptographically secure CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

/**
 * Set CSRF token as a cookie on the response (double-submit cookie pattern).
 * Called when an admin session is created or when a page is loaded.
 */
export function setCsrfCookie(res: NextApiResponse, token: string): void {
  const cookie = serialize(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by client JS to send as header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours
  })
  // Append to existing Set-Cookie headers
  const existing = res.getHeader('Set-Cookie')
  const cookies = existing
    ? Array.isArray(existing)
      ? [...existing, cookie]
      : [existing as string, cookie]
    : [cookie]
  res.setHeader('Set-Cookie', cookies)
}

/**
 * Validate the CSRF token from the request header against the cookie.
 * Uses the double-submit cookie pattern.
 *
 * Returns true if the request method is safe (GET, HEAD, OPTIONS)
 * or if the header token matches the cookie token.
 */
export function validateCsrfToken(req: NextApiRequest): boolean {
  const method = req.method?.toUpperCase()

  // Safe methods don't need CSRF validation
  if (!method || ['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true
  }

  const cookies = parse(req.headers.cookie || '')
  const cookieToken = cookies[CSRF_COOKIE_NAME]
  const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined

  if (!cookieToken || !headerToken) {
    return false
  }

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    )
  } catch {
    return false
  }
}
