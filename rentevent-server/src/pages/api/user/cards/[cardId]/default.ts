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

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: t('methodNotAllowed'),
    })
  }

  const { cardId } = req.query

  if (typeof cardId !== 'string') {
    return res.status(400).json({
      success: false,
      message: t('badRequest'),
    })
  }

  try {
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

    // Unset all other defaults and set this one
    await prisma.$transaction([
      prisma.card.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      prisma.card.update({
        where: { id: cardId },
        data: { isDefault: true },
      }),
    ])

    const updatedCard = await prisma.card.findUnique({
      where: { id: cardId },
    })

    return res.status(200).json({
      success: true,
      message: t('cardSetDefault'),
      data: {
        id: updatedCard!.id,
        card_number: updatedCard!.cardNumber,
        card_holder: updatedCard!.cardHolder,
        expiry_month: updatedCard!.expiryMonth,
        expiry_year: updatedCard!.expiryYear,
        card_type: updatedCard!.cardType,
        is_default: updatedCard!.isDefault,
        created_at: updatedCard!.createdAt,
      },
    })
  } catch (error) {
    console.error('Set default card error:', error)
    return res.status(500).json({
      success: false,
      message: t('internalServerError'),
    })
  }
}

export default withAuth(handler)
