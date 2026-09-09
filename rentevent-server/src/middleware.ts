import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Allowed origins for CORS — same-origin requests don't send an Origin header
// so they bypass this entirely. Only cross-origin requests are checked.
// Configure via ALLOWED_ORIGINS env var (comma-separated).
const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
)

// Always allow the app's own URL
const appUrl = process.env.NEXT_PUBLIC_APP_URL
if (appUrl) {
  ALLOWED_ORIGINS.add(appUrl)
}

const CORS_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
const CORS_HEADERS = 'Content-Type, Authorization, X-Requested-With, Accept, X-Language'

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false
  return ALLOWED_ORIGINS.has(origin)
}

function setCorsHeaders(response: NextResponse, origin: string) {
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Methods', CORS_METHODS)
  response.headers.set('Access-Control-Allow-Headers', CORS_HEADERS)
  response.headers.set('Access-Control-Max-Age', '86400')
}

export function middleware(request: NextRequest) {
  const { method, nextUrl } = request
  const pathname = nextUrl.pathname

  // Only handle API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const origin = request.headers.get('origin')

  // Log API requests
  const userAgent = request.headers.get('user-agent') || 'unknown'
  const contentType = request.headers.get('content-type') || 'none'
  const language = request.headers.get('x-language') || 'en'
  const hasAuth = request.headers.has('authorization')

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📥 ${method} ${pathname}`)
  console.log(`   Time: ${new Date().toISOString()}`)
  console.log(`   Auth: ${hasAuth ? '✓' : '✗'}`)
  console.log(`   Lang: ${language}`)
  console.log(`   Content-Type: ${contentType}`)
  console.log(`   User-Agent: ${userAgent.substring(0, 50)}...`)

  const searchParams = nextUrl.searchParams.toString()
  if (searchParams) {
    console.log(`   Query: ${searchParams}`)
  }

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 })
    if (origin && isOriginAllowed(origin)) {
      setCorsHeaders(response, origin)
    }
    return response
  }

  // Regular request
  const response = NextResponse.next()

  // Add request ID for tracing
  response.headers.set('x-request-id', crypto.randomUUID().substring(0, 8))

  // Set CORS headers only for allowed origins
  if (origin && isOriginAllowed(origin)) {
    setCorsHeaders(response, origin)
  }

  return response
}

export const config = {
  matcher: '/api/:path*',
}
