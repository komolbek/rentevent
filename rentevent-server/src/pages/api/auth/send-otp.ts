import type { NextApiRequest, NextApiResponse } from 'next'
import { generateOTP, isTestAuthEnabled } from '@/lib/auth/otp-service'
import { sendOTPSMS } from '@/lib/auth/sms-service'
import { withErrorHandler, ApiError } from '@/lib/api/error-handler'
import { checkRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const schema = z.object({
  phone_number: z.string().regex(/^\+998\d{9}$/, 'Invalid phone number format'),
})

export default withErrorHandler({ methods: ['POST'] }, async (req, res) => {
  const body = schema.parse(req.body)
  const phoneNumber = body.phone_number

  // Rate limit: max 3 OTP requests per phone per 5 minutes
  const phoneLimit = checkRateLimit(
    { namespace: 'otp-phone', maxRequests: 3, windowMs: 5 * 60 * 1000 },
    phoneNumber
  )
  if (!phoneLimit.allowed) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests',
      retry_after_seconds: Math.ceil(phoneLimit.retryAfterMs / 1000),
    })
  }

  // Rate limit: max 10 OTP requests per IP per 15 minutes
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
  const ipLimit = checkRateLimit(
    { namespace: 'otp-ip', maxRequests: 10, windowMs: 15 * 60 * 1000 },
    ip
  )
  if (!ipLimit.allowed) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests',
      retry_after_seconds: Math.ceil(ipLimit.retryAfterMs / 1000),
    })
  }

  const code = await generateOTP(phoneNumber)
  await sendOTPSMS(phoneNumber, code)

  return res.status(200).json({
    success: true,
    message: 'OTP sent',
    // Only return the code when test auth is explicitly enabled
    ...(isTestAuthEnabled() && { dev_code: code }),
  })
})
