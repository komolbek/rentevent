import prisma from '@/lib/db'
import crypto from 'crypto'

const OTP_EXPIRY_MINUTES = 5
const MAX_ATTEMPTS = 3

// Normalize phone number by removing + prefix and any spaces/dashes
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/^\+/, '').replace(/[\s-]/g, '')
}

// Check if test auth is explicitly enabled and phone is in the allow-list
function isTestPhoneNumber(phone: string): boolean {
  if (process.env.ENABLE_TEST_AUTH !== 'true') return false
  const testPhones = process.env.TEST_PHONE_NUMBERS
  if (!testPhones) return false
  const normalized = normalizePhoneNumber(phone)
  return testPhones.split(',').map(p => p.trim()).includes(normalized)
}

export function isTestAuthEnabled(): boolean {
  return process.env.ENABLE_TEST_AUTH === 'true'
}

export async function generateOTP(phoneNumber: string): Promise<string> {
  // Clean up expired OTPs
  await prisma.oTP.deleteMany({
    where: {
      phoneNumber,
      OR: [
        { expiresAt: { lt: new Date() } },
        { verified: true }
      ]
    }
  })

  // Generate 6-digit code
  // Use fixed code only when ENABLE_TEST_AUTH is true and phone is in allow-list
  const testOtp = process.env.TEST_OTP_CODE || ''
  const code = (isTestPhoneNumber(phoneNumber) && testOtp)
    ? testOtp
    : crypto.randomInt(100000, 999999).toString()

  const expiresAt = new Date()
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES)

  await prisma.oTP.create({
    data: {
      phoneNumber,
      code,
      expiresAt
    }
  })

  return code
}

export async function verifyOTP(
  phoneNumber: string,
  code: string
): Promise<{ valid: boolean; error?: string }> {
  const otp = await prisma.oTP.findFirst({
    where: {
      phoneNumber,
      verified: false,
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: 'desc' }
  })

  if (!otp) {
    return { valid: false, error: 'Код не найден или истёк' }
  }

  if (otp.attempts >= MAX_ATTEMPTS) {
    return { valid: false, error: 'Превышено количество попыток' }
  }

  // Use timing-safe comparison to prevent timing attacks
  const codeMatch = otp.code.length === code.length &&
    crypto.timingSafeEqual(Buffer.from(otp.code), Buffer.from(code))

  if (!codeMatch) {
    await prisma.oTP.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } }
    })
    return { valid: false, error: 'Неверный код' }
  }

  await prisma.oTP.update({
    where: { id: otp.id },
    data: { verified: true }
  })

  return { valid: true }
}
