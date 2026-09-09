import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import prisma from '@/lib/db'
import { verifyOTP } from '@/lib/auth/otp-service'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  const { phone, code } = req.body

  if (!phone || !code) {
    return res.status(400).json({
      success: false,
      message: 'Введите номер телефона и код',
    })
  }

  const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`

  // Verify staff exists
  const staff = await prisma.staff.findUnique({
    where: { phoneNumber: normalizedPhone },
  })

  if (!staff || !staff.isActive) {
    return res.status(400).json({
      success: false,
      message: 'Неверный код',
    })
  }

  // Verify OTP
  const result = await verifyOTP(normalizedPhone, code)

  if (!result.valid) {
    return res.status(400).json({
      success: false,
      message: result.error || 'Неверный код',
    })
  }

  // Generate a temporary reset token (valid for 10 minutes)
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_API_KEY
  if (!secret) throw new Error('ADMIN_SESSION_SECRET or ADMIN_API_KEY must be configured')
  const payload = `reset:${staff.id}:${Date.now()}`
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  const token = `${payload}:${signature}`

  return res.status(200).json({
    success: true,
    resetToken: token,
    message: 'Код подтверждён',
  })
}
