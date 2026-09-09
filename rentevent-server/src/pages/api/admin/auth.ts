import type { NextApiRequest, NextApiResponse } from 'next'
import { serialize, parse } from 'cookie'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import {
  createAdminSession,
  validateAdminSession,
  clearAdminSession,
} from '@/lib/auth/admin-middleware'
import { createTranslator } from '@/lib/i18n'
import { checkRateLimit } from '@/lib/rate-limit'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const t = createTranslator(req)

  // Login with phone + password
  if (req.method === 'POST') {
    const { phone, password } = req.body

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Введите номер телефона и пароль',
      })
    }

    // Normalize phone: ensure +998 prefix
    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`

    // Rate limit: max 5 login attempts per phone per 15 minutes
    const limit = checkRateLimit(
      { namespace: 'admin-login', maxRequests: 5, windowMs: 15 * 60 * 1000 },
      normalizedPhone
    )
    if (!limit.allowed) {
      return res.status(429).json({
        success: false,
        message: 'Слишком много попыток. Попробуйте позже.',
        retry_after_seconds: Math.ceil(limit.retryAfterMs / 1000),
      })
    }

    const staff = await prisma.staff.findUnique({
      where: { phoneNumber: normalizedPhone },
    })

    if (!staff || !staff.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Неверный номер телефона или пароль',
      })
    }

    // First-time login: staff has no password yet
    if (!staff.passwordHash) {
      // Allow login without password for first-time setup
      if (staff.mustChangePassword) {
        const sessionToken = createAdminSession(staff.id)

        res.setHeader(
          'Set-Cookie',
          serialize('admin_session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24,
            path: '/',
          })
        )

        return res.status(200).json({
          success: true,
          mustChangePassword: true,
          message: 'Необходимо установить пароль',
        })
      }

      return res.status(401).json({
        success: false,
        message: 'Неверный номер телефона или пароль',
      })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, staff.passwordHash)

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Неверный номер телефона или пароль',
      })
    }

    // Update last login
    await prisma.staff.update({
      where: { id: staff.id },
      data: { lastLoginAt: new Date() },
    })

    const sessionToken = createAdminSession(staff.id)

    res.setHeader(
      'Set-Cookie',
      serialize('admin_session', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24,
        path: '/',
      })
    )

    // Check if must change password
    if (staff.mustChangePassword) {
      return res.status(200).json({
        success: true,
        mustChangePassword: true,
        message: 'Необходимо установить пароль',
      })
    }

    return res.status(200).json({
      success: true,
      message: t('adminLoginSuccess'),
      staff: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
      },
    })
  }

  // Check session
  if (req.method === 'GET') {
    const cookies = parse(req.headers.cookie || '')
    const sessionToken = cookies.admin_session

    const result = validateAdminSession(sessionToken || '')

    if (!result.valid || !result.staffId) {
      return res.status(401).json({
        success: false,
        message: t('unauthorized'),
      })
    }

    const staff = await prisma.staff.findUnique({
      where: { id: result.staffId },
      select: {
        id: true,
        name: true,
        role: true,
        phoneNumber: true,
        isActive: true,
        mustChangePassword: true,
      },
    })

    if (!staff || !staff.isActive) {
      return res.status(401).json({
        success: false,
        message: t('unauthorized'),
      })
    }

    return res.status(200).json({
      success: true,
      authenticated: true,
      staff: {
        id: staff.id,
        name: staff.name,
        role: staff.role,
        phoneNumber: staff.phoneNumber,
        mustChangePassword: staff.mustChangePassword,
      },
    })
  }

  // Logout
  if (req.method === 'DELETE') {
    const cookies = parse(req.headers.cookie || '')
    const sessionToken = cookies.admin_session

    if (sessionToken) {
      clearAdminSession(sessionToken)
    }

    res.setHeader(
      'Set-Cookie',
      serialize('admin_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/',
      })
    )

    return res.status(200).json({
      success: true,
      message: t('logoutSuccess'),
    })
  }

  return res.status(405).json({
    success: false,
    message: t('methodNotAllowed'),
  })
}
