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
  const { productId } = req.query

  if (typeof productId !== 'string') {
    return res.status(400).json({
      success: false,
      message: t('badRequest'),
    })
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.favorite.delete({
        where: {
          userId_productId: { userId, productId },
        },
      })

      return res.status(200).json({
        success: true,
        message: t('removedFromFavorites'),
      })
    } catch (error) {
      console.error('Remove favorite error:', error)
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
