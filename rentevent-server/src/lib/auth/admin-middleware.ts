import { NextApiRequest, NextApiResponse } from 'next'
import { parse } from 'cookie'
import crypto from 'crypto'
import prisma from '@/lib/db'
import { validateCsrfToken } from '@/lib/csrf'

const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_API_KEY
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET or ADMIN_API_KEY must be configured')
  }
  return secret
}

// Create a signed session token with embedded staffId and timestamp
export function createAdminSession(staffId: string): string {
  const timestamp = Date.now()
  const payload = `staff:${staffId}:${timestamp}`
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('hex')
  return `${payload}:${signature}`
}

// Validate session token — returns staffId if valid
export function validateAdminSession(sessionToken: string): { valid: boolean; staffId?: string } {
  if (!sessionToken) return { valid: false }

  const parts = sessionToken.split(':')
  if (parts.length !== 4) return { valid: false }

  const [prefix, staffId, timestampStr, signature] = parts
  if (prefix !== 'staff') return { valid: false }

  const timestamp = parseInt(timestampStr, 10)
  if (isNaN(timestamp)) return { valid: false }

  // Check if session has expired
  const elapsed = Date.now() - timestamp
  if (elapsed > SESSION_DURATION) return { valid: false }

  // Verify signature
  const payload = `${prefix}:${staffId}:${timestampStr}`
  const expectedSignature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payload)
    .digest('hex')

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )

  return isValid ? { valid: true, staffId } : { valid: false }
}

export function clearAdminSession(_sessionToken: string): void {
  // With signed tokens, clearing is handled by cookie deletion on the client
}

// Get staff record from request cookie
export async function getStaffFromSession(req: NextApiRequest) {
  const cookies = parse(req.headers.cookie || '')
  const sessionToken = cookies.admin_session

  if (!sessionToken) return null

  const result = validateAdminSession(sessionToken)
  if (!result.valid || !result.staffId) return null

  const staff = await prisma.staff.findUnique({
    where: { id: result.staffId },
    select: {
      id: true,
      phoneNumber: true,
      name: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
    },
  })

  if (!staff || !staff.isActive) return null

  return staff
}

type AdminApiHandler = (
  req: NextApiRequest,
  res: NextApiResponse
) => Promise<void>

export function requireAdminAuth(handler: AdminApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const staff = await getStaffFromSession(req)

    if (!staff) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required',
      })
    }

    // CSRF validation for state-changing methods (POST, PUT, PATCH, DELETE)
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
    if (mutatingMethods.includes(req.method?.toUpperCase() || '')) {
      if (!validateCsrfToken(req)) {
        return res.status(403).json({
          success: false,
          message: 'Invalid or missing CSRF token',
        })
      }
    }

    // Block access if password change is required (except password-related endpoints)
    const url = req.url || ''
    const isPasswordEndpoint = url.includes('/set-password') || url.includes('/forgot-password')
    if (staff.mustChangePassword && !isPasswordEndpoint) {
      return res.status(403).json({
        success: false,
        message: 'Password change required',
        mustChangePassword: true,
      })
    }

    // Attach staff info to request
    ;(req as any).staffId = staff.id
    ;(req as any).staffRole = staff.role
    ;(req as any).staffName = staff.name

    return handler(req, res)
  }
}
