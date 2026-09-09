import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'

const RESET_TOKEN_EXPIRY = 10 * 60 * 1000 // 10 minutes

function validateResetToken(token: string): { valid: boolean; staffId?: string } {
  if (!token) return { valid: false }

  const parts = token.split(':')
  if (parts.length !== 4) return { valid: false }

  const [prefix, staffId, timestampStr, signature] = parts
  if (prefix !== 'reset') return { valid: false }

  const timestamp = parseInt(timestampStr, 10)
  if (isNaN(timestamp)) return { valid: false }

  // Check expiry
  if (Date.now() - timestamp > RESET_TOKEN_EXPIRY) return { valid: false }

  // Verify signature
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_API_KEY
  if (!secret) throw new Error('ADMIN_SESSION_SECRET or ADMIN_API_KEY must be configured')
  const payload = `${prefix}:${staffId}:${timestampStr}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )

  return isValid ? { valid: true, staffId } : { valid: false }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  const { resetToken, password, confirmPassword } = req.body

  if (!resetToken || !password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Заполните все поля',
    })
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: 'Пароли не совпадают',
    })
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Пароль должен содержать минимум 6 символов',
    })
  }

  const result = validateResetToken(resetToken)

  if (!result.valid || !result.staffId) {
    return res.status(400).json({
      success: false,
      message: 'Ссылка для сброса пароля истекла. Попробуйте ещё раз.',
    })
  }

  const staff = await prisma.staff.findUnique({
    where: { id: result.staffId },
  })

  if (!staff || !staff.isActive) {
    return res.status(400).json({
      success: false,
      message: 'Аккаунт не найден',
    })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.staff.update({
    where: { id: staff.id },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  })

  return res.status(200).json({
    success: true,
    message: 'Пароль успешно изменён',
  })
}
