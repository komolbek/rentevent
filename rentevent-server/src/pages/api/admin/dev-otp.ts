import type { NextApiRequest, NextApiResponse } from 'next'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'
import {
  getDevOTPLog,
  clearDevOTPLog,
  isMockMode,
} from '@/lib/auth/sms-service'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only available in mock SMS mode
  if (!isMockMode()) {
    return res.status(403).json({
      success: false,
      message: 'Dev OTP log is only available when SMS_PROVIDER is not "eskiz"',
    })
  }

  // GET — return recent OTP entries
  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      mode: 'mock',
      entries: getDevOTPLog(),
    })
  }

  // DELETE — clear log
  if (req.method === 'DELETE') {
    clearDevOTPLog()
    return res.status(200).json({
      success: true,
      message: 'Dev OTP log cleared',
    })
  }

  return res.status(405).json({
    success: false,
    message: 'Method not allowed',
  })
}

export default requireAdminAuth(handler)
