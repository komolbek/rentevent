import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { createTranslator } from '@/lib/i18n'
import { logRequest, logResponse } from '@/lib/logger'

/**
 * Standardized API error class. Use instead of ad-hoc error throwing.
 *
 * Usage:
 *   throw new ApiError(400, 'Product not found')
 *   throw new ApiError(409, 'Order already cancelled')
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface HandlerOptions {
  /** Allowed HTTP methods. Returns 405 for anything else. */
  methods?: HttpMethod[]
}

type ApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void | NextApiResponse> | void | NextApiResponse

/**
 * Centralized error handling wrapper for API routes.
 *
 * Handles:
 * - HTTP method validation (405)
 * - Request/response logging
 * - ZodError → 400 with structured errors
 * - ApiError → custom status code
 * - Unknown errors → 500 with generic message
 *
 * Usage:
 *   export default withErrorHandler({ methods: ['GET'] }, handler)
 */
export function withErrorHandler(
  options: HandlerOptions,
  handler: ApiHandler
): ApiHandler
export function withErrorHandler(handler: ApiHandler): ApiHandler
export function withErrorHandler(
  optionsOrHandler: HandlerOptions | ApiHandler,
  maybeHandler?: ApiHandler
): ApiHandler {
  const options: HandlerOptions =
    typeof optionsOrHandler === 'function' ? {} : optionsOrHandler
  const handler: ApiHandler =
    typeof optionsOrHandler === 'function' ? optionsOrHandler : maybeHandler!

  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now()
    const t = createTranslator(req)

    logRequest(req)

    // Method validation
    if (options.methods && !options.methods.includes(req.method as HttpMethod)) {
      logResponse(req, 405, startTime, 'Method not allowed')
      return res.status(405).json({
        success: false,
        message: t('methodNotAllowed'),
      })
    }

    try {
      await handler(req, res)
      logResponse(req, res.statusCode, startTime)
    } catch (error) {
      if (error instanceof z.ZodError) {
        logResponse(req, 400, startTime, 'Validation error')
        return res.status(400).json({
          success: false,
          message: t('validationError'),
          errors: error.errors,
        })
      }

      if (error instanceof ApiError) {
        logResponse(req, error.statusCode, startTime, error.message)
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
        })
      }

      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[API_ERROR] ${req.method} ${req.url}:`, error)
      logResponse(req, 500, startTime, message)
      return res.status(500).json({
        success: false,
        message: t('internalServerError'),
      })
    }
  }
}
