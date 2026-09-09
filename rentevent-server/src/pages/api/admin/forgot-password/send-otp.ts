import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { generateOTP, isTestAuthEnabled } from '@/lib/auth/otp-service'
import { sendAdminOTPSMS } from '@/lib/auth/sms-service'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  const { phone } = req.body

  if (!phone) {
    return res.status(400).json({
      success: false,
      message: 'Введите номер телефона',
    })
  }

  const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`

  // Check if staff exists with this phone
  const staff = await prisma.staff.findUnique({
    where: { phoneNumber: normalizedPhone },
  })

  if (!staff || !staff.isActive) {
    // Don't reveal whether the phone exists — return success anyway
    return res.status(200).json({
      success: true,
      message: 'Если номер зарегистрирован, код будет отправлен',
    })
  }

  // Generate and send OTP
  const code = await generateOTP(normalizedPhone)
  await sendAdminOTPSMS(normalizedPhone, code)

  return res.status(200).json({
    success: true,
    message: 'Код отправлен на ваш номер',
    ...(isTestAuthEnabled() && { dev_code: code }),
  })
}
