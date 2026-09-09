import { NextApiRequest, NextApiResponse } from 'next'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

const LOG_COLORS = {
  info: '\x1b[36m',    // Cyan
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  debug: '\x1b[90m',   // Gray
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
}

const STATUS_COLORS: Record<string, string> = {
  '2': LOG_COLORS.green,  // 2xx
  '3': LOG_COLORS.blue,   // 3xx
  '4': LOG_COLORS.warn,   // 4xx
  '5': LOG_COLORS.error,  // 5xx
}

function getStatusColor(status: number): string {
  const firstDigit = String(status)[0]
  return STATUS_COLORS[firstDigit] || LOG_COLORS.reset
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength) + '...'
}

export function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString()
  const color = LOG_COLORS[level]
  const prefix = `[${timestamp}] ${color}[${level.toUpperCase()}]${LOG_COLORS.reset}`

  if (data) {
    console.log(`${prefix} ${message}`, JSON.stringify(data, null, 2))
  } else {
    console.log(`${prefix} ${message}`)
  }
}

export function logRequest(req: NextApiRequest, additionalData?: Record<string, unknown>) {
  const { method, url, query, body } = req
  const userAgent = req.headers['user-agent'] || 'unknown'
  const language = req.headers['x-language'] || 'en'
  const hasAuth = !!req.headers.authorization

  console.log(`\n${'━'.repeat(60)}`)
  console.log(`📥 ${LOG_COLORS.blue}${method}${LOG_COLORS.reset} ${url}`)
  console.log(`   🕐 ${new Date().toISOString()}`)
  console.log(`   🔐 Auth: ${hasAuth ? '✅' : '❌'}`)
  console.log(`   🌐 Lang: ${language}`)

  if (Object.keys(query).length > 0) {
    console.log(`   📋 Query:`, query)
  }

  if (body && Object.keys(body).length > 0) {
    // Sanitize sensitive data
    const sanitizedBody = { ...body }
    if (sanitizedBody.password) sanitizedBody.password = '***'
    if (sanitizedBody.code) sanitizedBody.code = '***'
    if (sanitizedBody.otp) sanitizedBody.otp = '***'
    console.log(`   📦 Body:`, truncate(JSON.stringify(sanitizedBody), 200))
  }

  if (additionalData) {
    console.log(`   ℹ️  Extra:`, additionalData)
  }
}

export function logResponse(
  req: NextApiRequest,
  statusCode: number,
  startTime: number,
  error?: string
) {
  const duration = Date.now() - startTime
  const statusColor = getStatusColor(statusCode)
  const durationStr = formatDuration(duration)

  const icon = statusCode < 400 ? '✅' : statusCode < 500 ? '⚠️' : '❌'

  console.log(`${icon} ${statusColor}${statusCode}${LOG_COLORS.reset} ${req.method} ${req.url} (${durationStr})`)

  if (error) {
    console.log(`   💥 Error: ${error}`)
  }

  console.log(`${'━'.repeat(60)}\n`)
}

// Higher-order function to wrap API handlers with logging
type ApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void

export function withLogging(handler: ApiHandler): ApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now()

    logRequest(req)

    // Intercept res.json and res.status to capture response
    const originalJson = res.json.bind(res)
    const originalStatus = res.status.bind(res)
    let capturedStatus = 200
    let capturedError: string | undefined

    res.status = (code: number) => {
      capturedStatus = code
      return originalStatus(code)
    }

    res.json = (data: unknown) => {
      if (typeof data === 'object' && data !== null) {
        const obj = data as Record<string, unknown>
        if (obj.success === false && obj.message) {
          capturedError = String(obj.message)
        }
      }
      logResponse(req, capturedStatus, startTime, capturedError)
      return originalJson(data)
    }

    try {
      await handler(req, res)
    } catch (error) {
      capturedError = error instanceof Error ? error.message : 'Unknown error'
      logResponse(req, 500, startTime, capturedError)
      throw error
    }
  }
}
