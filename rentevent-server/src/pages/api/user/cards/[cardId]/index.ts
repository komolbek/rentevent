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
  const { cardId } = req.query

  if (typeof cardId !== 'string') {
    return res.status(400).json({
      success: false,
      message: t('badRequest'),
    })
  }

  // Verify card belongs to user
  const card = await prisma.card.findFirst({
    where: { id: cardId, userId },
  })

  if (!card) {
    return res.status(404).json({
      success: false,
      message: t('cardNotFound'),
    })
  }

  if (req.method === 'DELETE') {
    try {
      // If deleting default card, set another as default
      if (card.isDefault) {
        const otherCard = await prisma.card.findFirst({
          where: { userId, id: { not: cardId } },
          orderBy: { createdAt: 'desc' },
        })

        if (otherCard) {
          await prisma.card.update({
            where: { id: otherCard.id },
            data: { isDefault: true },
          })
        }
      }

      await prisma.card.delete({
        where: { id: cardId },
      })

      return res.status(200).json({
        success: true,
        message: t('cardDeleted'),
      })
    } catch (error) {
      console.error('Delete card error:', error)
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
