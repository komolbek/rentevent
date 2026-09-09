import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPrismaMock, type PrismaMock } from '../helpers/prisma-mock'

let prismaMock: PrismaMock

vi.mock('@/lib/db', () => {
  const mock = createPrismaMock()
  prismaMock = mock
  return { default: mock, prisma: mock }
})

import { generateOTP, verifyOTP, isTestAuthEnabled } from '@/lib/auth/otp-service'
import { createSession, invalidateSession, getSessionUser } from '@/lib/auth/session-service'
import { createAdminSession, validateAdminSession } from '@/lib/auth/admin-middleware'

describe('OTP Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateOTP', () => {
    it('should generate a 6-digit OTP code', async () => {
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

      const code = await generateOTP('+998901234567')

      expect(code).toMatch(/^\d{6}$/)
      expect(prismaMock.oTP.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phoneNumber: '+998901234567',
            code: expect.any(String),
          }),
        })
      )
    })

    it('should clean up expired OTPs before generating new one', async () => {
      prismaMock.oTP.deleteMany.mockResolvedValue({ count: 2 })
      prismaMock.oTP.create.mockResolvedValue({
        id: 'otp-new',
        phoneNumber: '+998901234567',
        code: '654321',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        verified: false,
        attempts: 0,
        createdAt: new Date(),
      })

      await generateOTP('+998901234567')

      expect(prismaMock.oTP.deleteMany).toHaveBeenCalledWith({
        where: {
          phoneNumber: '+998901234567',
          OR: [
            { expiresAt: { lt: expect.any(Date) } },
            { verified: true },
          ],
        },
      })
    })

    it('should store OTP with expiration time', async () => {
      prismaMock.oTP.deleteMany.mockResolvedValue({ count: 0 })
      prismaMock.oTP.create.mockImplementation(async ({ data }) => ({
        id: 'otp-1',
        ...data,
        verified: false,
        attempts: 0,
        createdAt: new Date(),
      }))

      await generateOTP('+998901234567')

      const createCall = prismaMock.oTP.create.mock.calls[0][0]
      const expiresAt = createCall.data.expiresAt
      const now = new Date()
      const diffMinutes = (expiresAt.getTime() - now.getTime()) / (60 * 1000)
      // Should expire in approximately 5 minutes
      expect(diffMinutes).toBeGreaterThan(4)
      expect(diffMinutes).toBeLessThanOrEqual(5.1)
    })
  })

  describe('verifyOTP', () => {
    it('should return valid for correct OTP code', async () => {
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

      const result = await verifyOTP('+998901234567', '123456')

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
      expect(prismaMock.oTP.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { verified: true },
      })
    })

    it('should return invalid for wrong code', async () => {
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

      const result = await verifyOTP('+998901234567', '123456')

      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
      // Should increment attempts
      expect(prismaMock.oTP.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { attempts: { increment: 1 } },
      })
    })

    it('should return invalid when OTP not found (expired)', async () => {
      prismaMock.oTP.findFirst.mockResolvedValue(null)

      const result = await verifyOTP('+998901234567', '123456')

      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should return invalid when max attempts exceeded', async () => {
      const futureDate = new Date(Date.now() + 5 * 60 * 1000)
      prismaMock.oTP.findFirst.mockResolvedValue({
        id: 'otp-1',
        phoneNumber: '+998901234567',
        code: '123456',
        expiresAt: futureDate,
        verified: false,
        attempts: 3,
        createdAt: new Date(),
      })

      const result = await verifyOTP('+998901234567', '123456')

      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('isTestAuthEnabled', () => {
    const originalEnv = process.env.ENABLE_TEST_AUTH

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.ENABLE_TEST_AUTH = originalEnv
      } else {
        delete process.env.ENABLE_TEST_AUTH
      }
    })

    it('should return true when ENABLE_TEST_AUTH is "true"', () => {
      process.env.ENABLE_TEST_AUTH = 'true'
      expect(isTestAuthEnabled()).toBe(true)
    })

    it('should return false when ENABLE_TEST_AUTH is not set', () => {
      delete process.env.ENABLE_TEST_AUTH
      expect(isTestAuthEnabled()).toBe(false)
    })

    it('should return false when ENABLE_TEST_AUTH is "false"', () => {
      process.env.ENABLE_TEST_AUTH = 'false'
      expect(isTestAuthEnabled()).toBe(false)
    })
  })
})

describe('Session Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createSession', () => {
    it('should create a session token and store it', async () => {
      prismaMock.session.deleteMany.mockResolvedValue({ count: 0 })
      prismaMock.session.create.mockImplementation(async ({ data }) => ({
        id: 'session-1',
        ...data,
      }))

      const token = await createSession('user-1', 'device-123', 'Test Agent')

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBe(64) // 32 bytes hex = 64 chars
      expect(prismaMock.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sessionToken: expect.any(String),
          userId: 'user-1',
          deviceId: 'device-123',
          deviceInfo: 'Test Agent',
          expires: expect.any(Date),
        }),
      })
    })

    it('should invalidate existing sessions for the same device', async () => {
      prismaMock.session.deleteMany.mockResolvedValue({ count: 1 })
      prismaMock.session.create.mockResolvedValue({
        id: 'session-new',
        sessionToken: 'new-token',
      })

      await createSession('user-1', 'device-123')

      expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          deviceId: 'device-123',
        },
      })
    })

    it('should set expiration to 30 days from now', async () => {
      prismaMock.session.deleteMany.mockResolvedValue({ count: 0 })
      prismaMock.session.create.mockImplementation(async ({ data }) => ({
        id: 'session-1',
        ...data,
      }))

      await createSession('user-1', 'device-1')

      const createCall = prismaMock.session.create.mock.calls[0][0]
      const expires = createCall.data.expires
      const now = new Date()
      const diffDays = (expires.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      expect(diffDays).toBeGreaterThan(29)
      expect(diffDays).toBeLessThanOrEqual(30.1)
    })
  })

  describe('invalidateSession', () => {
    it('should delete the session by token', async () => {
      prismaMock.session.delete.mockResolvedValue({})

      await invalidateSession('token-to-invalidate')

      expect(prismaMock.session.delete).toHaveBeenCalledWith({
        where: { sessionToken: 'token-to-invalidate' },
      })
    })

    it('should not throw if session does not exist', async () => {
      prismaMock.session.delete.mockRejectedValue(new Error('Not found'))

      await expect(invalidateSession('non-existent')).resolves.toBeUndefined()
    })
  })

  describe('getSessionUser', () => {
    it('should return the user for a valid session', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const mockUser = { id: 'user-1', name: 'Test', phoneNumber: '+998901234567' }

      prismaMock.session.findUnique.mockResolvedValue({
        id: 'session-1',
        sessionToken: 'valid-token',
        userId: 'user-1',
        expires: futureDate,
        user: mockUser,
      })

      const user = await getSessionUser('valid-token')

      expect(user).toEqual(mockUser)
    })

    it('should return null for non-existent session', async () => {
      prismaMock.session.findUnique.mockResolvedValue(null)

      const user = await getSessionUser('invalid-token')

      expect(user).toBeNull()
    })

    it('should return null and delete expired session', async () => {
      const pastDate = new Date(Date.now() - 1000) // 1 second ago
      prismaMock.session.findUnique.mockResolvedValue({
        id: 'session-1',
        sessionToken: 'expired-token',
        userId: 'user-1',
        expires: pastDate,
        user: { id: 'user-1' },
      })
      prismaMock.session.delete.mockResolvedValue({})

      const user = await getSessionUser('expired-token')

      expect(user).toBeNull()
      expect(prismaMock.session.delete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      })
    })
  })
})

describe('Admin Session', () => {
  const originalSecret = process.env.ADMIN_SESSION_SECRET

  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = 'test-admin-secret-key-12345'
  })

  afterEach(() => {
    if (originalSecret !== undefined) {
      process.env.ADMIN_SESSION_SECRET = originalSecret
    }
  })

  describe('createAdminSession', () => {
    it('should create a signed session token', () => {
      const token = createAdminSession('staff-1')

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      // Token format: staff:staffId:timestamp:signature
      const parts = token.split(':')
      expect(parts).toHaveLength(4)
      expect(parts[0]).toBe('staff')
      expect(parts[1]).toBe('staff-1')
      expect(parseInt(parts[2], 10)).toBeGreaterThan(0)
      expect(parts[3].length).toBe(64) // SHA-256 hex
    })
  })

  describe('validateAdminSession', () => {
    it('should validate a recently created session', () => {
      const token = createAdminSession('staff-123')
      const result = validateAdminSession(token)

      expect(result.valid).toBe(true)
      expect(result.staffId).toBe('staff-123')
    })

    it('should reject an empty token', () => {
      const result = validateAdminSession('')

      expect(result.valid).toBe(false)
    })

    it('should reject a malformed token', () => {
      const result = validateAdminSession('not-a-valid-token')

      expect(result.valid).toBe(false)
    })

    it('should reject a token with wrong prefix', () => {
      const result = validateAdminSession('admin:staff-1:12345:fakesig')

      expect(result.valid).toBe(false)
    })

    it('should reject a tampered token (wrong signature)', () => {
      const token = createAdminSession('staff-1')
      const parts = token.split(':')
      // Tamper with the signature
      parts[3] = 'a'.repeat(64)
      const tamperedToken = parts.join(':')

      const result = validateAdminSession(tamperedToken)

      expect(result.valid).toBe(false)
    })

    it('should reject a token with modified staffId', () => {
      const token = createAdminSession('staff-1')
      const parts = token.split(':')
      // Modify the staffId
      parts[1] = 'staff-hacked'
      const tamperedToken = parts.join(':')

      const result = validateAdminSession(tamperedToken)

      expect(result.valid).toBe(false)
    })

    it('should reject an expired token', () => {
      // Create a token with a very old timestamp
      const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      const crypto = require('crypto')
      const payload = `staff:staff-1:${oldTimestamp}`
      const signature = crypto
        .createHmac('sha256', 'test-admin-secret-key-12345')
        .update(payload)
        .digest('hex')
      const expiredToken = `${payload}:${signature}`

      const result = validateAdminSession(expiredToken)

      expect(result.valid).toBe(false)
    })
  })
})
