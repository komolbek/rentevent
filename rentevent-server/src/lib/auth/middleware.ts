import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { logRequest, logResponse } from '@/lib/logger'

export interface AuthResult {
  authenticated: boolean
  userId?: string
  error?: string
}

export async function authMiddleware(req: NextApiRequest): Promise<AuthResult> {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing or invalid authorization header' }
  }

  const token = authHeader.substring(7)

  try {
    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: { user: true }
    })

    if (!session) {
      return { authenticated: false, error: 'Invalid session token' }
    }

    if (new Date() > session.expires) {
      await prisma.session.delete({ where: { id: session.id } })
      return { authenticated: false, error: 'Session expired' }
    }

    if (!session.user.isActive) {
      return { authenticated: false, error: 'Account is inactive' }
    }

    return { authenticated: true, userId: session.userId }
  } catch (error) {
    console.error('Auth middleware error:', error)
    return { authenticated: false, error: 'Authentication failed' }
  }
}

type ApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => Promise<void>

export function withAuth(handler: ApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now()

    logRequest(req)

    const result = await authMiddleware(req)

    if (!result.authenticated || !result.userId) {
      logResponse(req, 401, startTime, result.error)
      return res.status(401).json({
        success: false,
        message: result.error || 'Unauthorized'
      })
    }

    // Intercept response to log it
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
      return await handler(req, res, result.userId)
    } catch (error) {
      capturedError = error instanceof Error ? error.message : 'Unknown error'
      logResponse(req, 500, startTime, capturedError)
      throw error
    }
  }
}
