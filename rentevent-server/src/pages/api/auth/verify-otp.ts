import prisma from '@/lib/db'
import { verifyOTP } from '@/lib/auth/otp-service'
import { createSession } from '@/lib/auth/session-service'
import { withErrorHandler, ApiError } from '@/lib/api/error-handler'
import { createTranslator } from '@/lib/i18n'
import { z } from 'zod'

const schema = z.object({
  phone_number: z.string().regex(/^\+998\d{9}$/, 'Invalid phone number format'),
  code: z.string().length(6, 'Code must be 6 digits'),
  device_id: z.string().min(1, 'Device ID required'),
})

export default withErrorHandler({ methods: ['POST'] }, async (req, res) => {
  const t = createTranslator(req)
  const body = schema.parse(req.body)

  // Verify OTP
  const otpResult = await verifyOTP(body.phone_number, body.code)
  if (!otpResult.valid) {
    throw new ApiError(400, otpResult.error || t('otpInvalid'))
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { phoneNumber: body.phone_number },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        phoneNumber: body.phone_number,
      },
    })
  }

  // Create session
  const sessionToken = await createSession(
    user.id,
    body.device_id,
    req.headers['user-agent']
  )

  return res.status(200).json({
    success: true,
    message: t('loginSuccess'),
    token: sessionToken,
    user: {
      id: user.id,
      phone_number: user.phoneNumber,
      name: user.name,
      created_at: user.createdAt,
    },
  })
})
