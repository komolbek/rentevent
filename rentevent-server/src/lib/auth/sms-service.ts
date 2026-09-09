// SMS Service — supports mock (dev), eskiz (direct), and gateway (sms-gateway) providers
// Controlled by SMS_PROVIDER env var: "mock" | "eskiz" | "gateway"

export interface SMSResult {
  success: boolean
  messageId?: string
  error?: string
}

// ===================== DEV OTP LOG =====================
// In-memory store for OTPs sent in mock mode — displayed on /admin/dev-otp

export interface DevOTPEntry {
  id: string
  phoneNumber: string
  code: string
  type: 'customer_auth' | 'admin_reset'
  message: string
  createdAt: string
}

const MAX_DEV_ENTRIES = 50
const devOTPLog: DevOTPEntry[] = []

export function getDevOTPLog(): DevOTPEntry[] {
  return [...devOTPLog]
}

export function clearDevOTPLog(): void {
  devOTPLog.length = 0
}

function addDevOTPEntry(
  phoneNumber: string,
  code: string,
  type: DevOTPEntry['type'],
  message: string
) {
  devOTPLog.unshift({
    id: `dev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    phoneNumber,
    code,
    type,
    message,
    createdAt: new Date().toISOString(),
  })
  // Keep only last N entries
  if (devOTPLog.length > MAX_DEV_ENTRIES) {
    devOTPLog.length = MAX_DEV_ENTRIES
  }
}

// ===================== SMS PROVIDERS =====================

export function isMockMode(): boolean {
  const provider = process.env.SMS_PROVIDER || 'mock'
  return provider === 'mock'
}

export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<SMSResult> {
  const provider = process.env.SMS_PROVIDER || 'mock'

  switch (provider) {
    case 'gateway':
      return sendGatewaySMS(phoneNumber, message)
    case 'eskiz':
      return sendEskizSMS(phoneNumber, message)
    case 'mock':
    default:
      return sendMockSMS(phoneNumber, message)
  }
}

async function sendMockSMS(
  phoneNumber: string,
  message: string
): Promise<SMSResult> {
  console.log(`📱 [MOCK SMS] To: ${phoneNumber}`)
  console.log(`📱 [MOCK SMS] Message: ${message}`)

  return {
    success: true,
    messageId: `mock_${Date.now()}`,
  }
}

async function sendGatewaySMS(
  phoneNumber: string,
  message: string
): Promise<SMSResult> {
  const gatewayUrl = process.env.SMS_GATEWAY_URL
  const apiKey = process.env.SMS_GATEWAY_API_KEY

  if (!gatewayUrl || !apiKey) {
    console.error('SMS_GATEWAY_URL or SMS_GATEWAY_API_KEY not configured')
    return { success: false, error: 'SMS gateway not configured' }
  }

  try {
    const phone = phoneNumber.replace(/^\+/, '')

    const response = await fetch(`${gatewayUrl}/sms/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ phone, message }),
    })

    const data = await response.json()

    if (response.ok && data.status === 'sent') {
      return { success: true, messageId: data.id }
    }

    console.error('SMS Gateway error:', data)
    return { success: false, error: data.errorMessage || 'SMS sending failed' }
  } catch (error) {
    console.error('SMS Gateway error:', error)
    return { success: false, error: 'SMS gateway request failed' }
  }
}

async function sendEskizSMS(
  phoneNumber: string,
  message: string
): Promise<SMSResult> {
  const token = process.env.ESKIZ_API_TOKEN
  if (!token) {
    console.error('ESKIZ_API_TOKEN not configured')
    return { success: false, error: 'SMS provider not configured' }
  }

  try {
    // Eskiz API expects phone without + prefix
    const phone = phoneNumber.replace(/^\+/, '')

    const response = await fetch(
      'https://notify.eskiz.uz/api/message/sms/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile_phone: phone,
          message,
          from: process.env.SMS_SENDER || '4210',
        }),
      }
    )

    const data = await response.json()

    if (response.ok && data.status === 'waiting') {
      return { success: true, messageId: data.id?.toString() }
    }

    console.error('Eskiz API error:', data)
    return { success: false, error: data.message || 'SMS sending failed' }
  } catch (error) {
    console.error('Eskiz SMS error:', error)
    return { success: false, error: 'SMS sending failed' }
  }
}

// ===================== SMS TEMPLATES =====================
// All templates are Eskiz-compliant:
// - Must include resource name ("RentEvent" / "platforma RentEvent")
// - Must include purpose of the code
// - Must be in the exact format that will be sent (no variables/masks)

/**
 * Customer auth OTP (login/registration)
 * Eskiz template: "Kod podtverzhdeniya dlya vhoda na platformu RentEvent: XXXXXX. Nikomu ne soobshchayte etot kod."
 */
export async function sendOTPSMS(
  phoneNumber: string,
  code: string
): Promise<SMSResult> {
  const message = `Kod podtverzhdeniya dlya vhoda na platformu RentEvent: ${code}. Nikomu ne soobshchayte etot kod.`

  if (isMockMode()) {
    addDevOTPEntry(phoneNumber, code, 'customer_auth', message)
  }

  return sendSMS(phoneNumber, message)
}

/**
 * Admin password reset OTP
 * Eskiz template: "Kod dlya vosstanovleniya parolya na platforme RentEvent: XXXXXX. Nikomu ne soobshchayte etot kod."
 */
export async function sendAdminOTPSMS(
  phoneNumber: string,
  code: string
): Promise<SMSResult> {
  const message = `Kod dlya vosstanovleniya parolya na platforme RentEvent: ${code}. Nikomu ne soobshchayte etot kod.`

  if (isMockMode()) {
    addDevOTPEntry(phoneNumber, code, 'admin_reset', message)
  }

  return sendSMS(phoneNumber, message)
}
