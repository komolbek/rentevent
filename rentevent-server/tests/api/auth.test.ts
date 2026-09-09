import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPrismaMock, type PrismaMock } from '../helpers/prisma-mock'
import {
  createMockRequest,
  createMockResponse,
  createMockUser,
} from '../helpers/api-test-utils'

// Create a fresh prisma mock before module imports
let prismaMock: PrismaMock

vi.mock('@/lib/db', () => {
  const mock = createPrismaMock()
  prismaMock = mock
  return { default: mock, prisma: mock }
})

vi.mock('@/lib/auth/sms-service', () => ({
  sendOTPSMS: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/logger', () => ({
  logRequest: vi.fn(),
  logResponse: vi.fn(),
}))

// Import handlers after mocking
import sendOtpHandler from '@/pages/api/auth/send-otp'
import verifyOtpHandler from '@/pages/api/auth/verify-otp'
import logoutHandler from '@/pages/api/auth/logout'

describe('POST /api/auth/send-otp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset rate limit store between tests by clearing the module cache
    vi.resetModules()
  })

  it('should send OTP for a valid phone number', async () => {
    prismaMock.oTP.deleteMany.mockResolvedValue({ count: 0 })
    prismaMock.oTP.create.mockResolvedValue({
      id: 'otp-1',
      phoneNumber: '+998901234567',
      code: '123456',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      verified: false,
      attempts: 0,
      createdAt: new Date(),
    })

    const req = createMockRequest({
      method: 'POST',
      body: { phone_number: '+998901234567' },
    })
    const res = createMockResponse()

    await sendOtpHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res._json).toMatchObject({
      success: true,
      message: 'OTP sent',
    })
  })

  it('should return 400 for an invalid phone number format', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: { phone_number: '12345' },
    })
    const res = createMockResponse()

    await sendOtpHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json.success).toBe(false)
  })

  it('should return 400 for missing phone number', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: {},
    })
    const res = createMockResponse()

    await sendOtpHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json.success).toBe(false)
  })

  it('should reject non-POST methods', async () => {
    const req = createMockRequest({
      method: 'GET',
    })
    const res = createMockResponse()

    await sendOtpHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
  })
})

describe('POST /api/auth/verify-otp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should verify a valid OTP and return a session token', async () => {
    const mockUser = createMockUser()
    const futureDate = new Date(Date.now() + 5 * 60 * 1000)

    prismaMock.oTP.findFirst.mockResolvedValue({
      id: 'otp-1',
      phoneNumber: '+998901234567',
      code: '123456',
      expiresAt: futureDate,
      verified: false,
      attempts: 0,
      createdAt: new Date(),
    })
    prismaMock.oTP.update.mockResolvedValue({})
    prismaMock.user.findUnique.mockResolvedValue(mockUser)
    prismaMock.session.deleteMany.mockResolvedValue({ count: 0 })
    prismaMock.session.create.mockResolvedValue({
      id: 'session-1',
      sessionToken: 'generated-token',
      userId: mockUser.id,
      deviceId: 'device-1',
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })

    const req = createMockRequest({
      method: 'POST',
      body: {
        phone_number: '+998901234567',
        code: '123456',
        device_id: 'device-1',
      },
    })
    const res = createMockResponse()

    await verifyOtpHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res._json).toMatchObject({
      success: true,
      token: expect.any(String),
      user: expect.objectContaining({
        id: mockUser.id,
        phone_number: mockUser.phoneNumber,
      }),
    })
  })

  it('should return 400 for an expired OTP', async () => {
    // No OTP found (already expired and cleaned up)
    prismaMock.oTP.findFirst.mockResolvedValue(null)

    const req = createMockRequest({
      method: 'POST',
      body: {
        phone_number: '+998901234567',
        code: '123456',
        device_id: 'device-1',
      },
    })
    const res = createMockResponse()

    await verifyOtpHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json.success).toBe(false)
  })

  it('should return 400 for a wrong OTP code', async () => {
    const futureDate = new Date(Date.now() + 5 * 60 * 1000)

    prismaMock.oTP.findFirst.mockResolvedValue({
      id: 'otp-1',
      phoneNumber: '+998901234567',
      code: '654321',
      expiresAt: futureDate,
      verified: false,
      attempts: 0,
      createdAt: new Date(),
    })
    prismaMock.oTP.update.mockResolvedValue({})

    const req = createMockRequest({
      method: 'POST',
      body: {
        phone_number: '+998901234567',
        code: '123456',
        device_id: 'device-1',
      },
    })
    const res = createMockResponse()

    await verifyOtpHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json.success).toBe(false)
    // Should increment attempts
    expect(prismaMock.oTP.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { attempts: { increment: 1 } },
      })
    )
  })

  it('should return 400 when max attempts exceeded', async () => {
    const futureDate = new Date(Date.now() + 5 * 60 * 1000)

    prismaMock.oTP.findFirst.mockResolvedValue({
      id: 'otp-1',
      phoneNumber: '+998901234567',
      code: '123456',
      expiresAt: futureDate,
      verified: false,
      attempts: 3, // MAX_ATTEMPTS reached
      createdAt: new Date(),
    })

    const req = createMockRequest({
      method: 'POST',
      body: {
        phone_number: '+998901234567',
        code: '123456',
        device_id: 'device-1',
      },
    })
    const res = createMockResponse()

    await verifyOtpHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json.success).toBe(false)
  })

  it('should create a new user if one does not exist', async () => {
    const futureDate = new Date(Date.now() + 5 * 60 * 1000)
    const newUser = createMockUser({ id: 'new-user-1', name: null })

    prismaMock.oTP.findFirst.mockResolvedValue({
      id: 'otp-1',
      phoneNumber: '+998901234567',
      code: '123456',
      expiresAt: futureDate,
      verified: false,
      attempts: 0,
      createdAt: new Date(),
    })
    prismaMock.oTP.update.mockResolvedValue({})
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue(newUser)
    prismaMock.session.deleteMany.mockResolvedValue({ count: 0 })
    prismaMock.session.create.mockResolvedValue({
      id: 'session-1',
      sessionToken: 'new-token',
      userId: newUser.id,
      deviceId: 'device-1',
      expires: new Date(),
    })

    const req = createMockRequest({
      method: 'POST',
      body: {
        phone_number: '+998901234567',
        code: '123456',
        device_id: 'device-1',
      },
    })
    const res = createMockResponse()

    await verifyOtpHandler(req, res)

    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: { phoneNumber: '+998901234567' },
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res._json.success).toBe(true)
  })

  it('should return 400 for missing required fields', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: { phone_number: '+998901234567' }, // missing code and device_id
    })
    const res = createMockResponse()

    await verifyOtpHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should invalidate session and return success', async () => {
    prismaMock.session.delete.mockResolvedValue({})

    const req = createMockRequest({
      method: 'POST',
      headers: {
        authorization: 'Bearer valid-token-123',
      },
    })
    const res = createMockResponse()

    await logoutHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res._json).toMatchObject({
      success: true,
    })
    expect(prismaMock.session.delete).toHaveBeenCalledWith({
      where: { sessionToken: 'valid-token-123' },
    })
  })

  it('should return success even without auth header', async () => {
    const req = createMockRequest({
      method: 'POST',
    })
    const res = createMockResponse()

    await logoutHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res._json.success).toBe(true)
  })

  it('should handle non-existent session gracefully', async () => {
    prismaMock.session.delete.mockRejectedValue(new Error('Not found'))

    const req = createMockRequest({
      method: 'POST',
      headers: {
        authorization: 'Bearer non-existent-token',
      },
    })
    const res = createMockResponse()

    await logoutHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res._json.success).toBe(true)
  })
})
