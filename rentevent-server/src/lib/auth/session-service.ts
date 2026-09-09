import prisma from '@/lib/db'
import crypto from 'crypto'

const SESSION_DURATION_DAYS = 30

export async function createSession(
  userId: string,
  deviceId: string,
  deviceInfo?: string
): Promise<string> {
  // Invalidate existing sessions for this device (single device login)
  await prisma.session.deleteMany({
    where: {
      userId,
      deviceId
    }
  })

  const sessionToken = crypto.randomBytes(32).toString('hex')
  const expires = new Date()
  expires.setDate(expires.getDate() + SESSION_DURATION_DAYS)

  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      deviceId,
      deviceInfo,
      expires
    }
  })

  return sessionToken
}

export async function invalidateSession(sessionToken: string): Promise<void> {
  await prisma.session.delete({
    where: { sessionToken }
  }).catch(() => {
    // Session might not exist
  })
}

export async function invalidateAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId }
  })
}

export async function getSessionUser(sessionToken: string) {
  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true }
  })

  if (!session) return null
  if (new Date() > session.expires) {
    await prisma.session.delete({ where: { id: session.id } })
    return null
  }

  return session.user
}
