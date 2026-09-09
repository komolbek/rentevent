import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { withAuth } from '@/lib/auth/middleware'
import { createTranslator } from '@/lib/i18n'

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const t = createTranslator(req)

  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        return res.status(404).json({
          success: false,
          message: t('userNotFound'),
        })
      }

      return res.status(200).json({
        success: true,
        data: {
          id: user.id,
          phone_number: user.phoneNumber,
          name: user.name,
          created_at: user.createdAt,
        },
      })
    } catch (error) {
      console.error('Get profile error:', error)
      return res.status(500).json({
        success: false,
        message: t('internalServerError'),
      })
    }
  }

  if (req.method === 'POST') {
    try {
      const { name } = req.body

      const user = await prisma.user.update({
        where: { id: userId },
        data: { name },
      })

      return res.status(200).json({
        success: true,
        message: t('profileUpdated'),
        data: {
          id: user.id,
          phone_number: user.phoneNumber,
          name: user.name,
          created_at: user.createdAt,
        },
      })
    } catch (error) {
      console.error('Update profile error:', error)
      return res.status(500).json({
        success: false,
        message: t('internalServerError'),
      })
    }
  }

  return res.status(405).json({
    success: false,
    message: t('methodNotAllowed'),
  })
}

export default withAuth(handler)
