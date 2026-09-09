import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { withAuth } from '@/lib/auth/middleware'
import { createTranslator } from '@/lib/i18n'
import { z } from 'zod'

const cardSchema = z.object({
  card_number: z.string().min(13).max(19),
  card_holder: z.string().min(1),
  expiry_month: z.number().int().min(1).max(12),
  expiry_year: z.number().int().min(24).max(99),
})

function maskCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '')
  const last4 = cleaned.slice(-4)
  return `**** **** **** ${last4}`
}

function isValidLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\s/g, '').split('').map(Number)
  let sum = 0
  let isSecond = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i]
    if (isSecond) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    isSecond = !isSecond
  }
  return sum % 10 === 0
}

function detectCardType(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\s/g, '')

  // Uzbekistan cards
  if (cleaned.startsWith('8600')) return 'uzcard'
  if (cleaned.startsWith('9860')) return 'humo'

  // International cards
  if (cleaned.startsWith('4')) return 'visa'
  if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'mastercard'

  return 'unknown'
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const t = createTranslator(req)

  if (req.method === 'GET') {
    try {
      const cards = await prisma.card.findMany({
        where: { userId },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' },
        ],
      })

      return res.status(200).json({
        success: true,
        data: cards.map((card) => ({
          id: card.id,
          card_number: card.cardNumber,
          card_holder: card.cardHolder,
          expiry_month: card.expiryMonth,
          expiry_year: card.expiryYear,
          card_type: card.cardType,
          is_default: card.isDefault,
          created_at: card.createdAt,
        })),
      })
    } catch (error) {
      console.error('Get cards error:', error)
      return res.status(500).json({
        success: false,
        message: t('internalServerError'),
      })
    }
  }

  if (req.method === 'POST') {
    try {
      const body = cardSchema.parse(req.body)

      // Validate card number with Luhn algorithm
      if (!isValidLuhn(body.card_number)) {
        return res.status(400).json({
          success: false,
          message: t('invalidCardNumber'),
        })
      }

      // Check max cards limit (5)
      const count = await prisma.card.count({ where: { userId } })
      if (count >= 5) {
        return res.status(400).json({
          success: false,
          message: t('maxCardsReached'),
        })
      }

      const maskedNumber = maskCardNumber(body.card_number)
      const cardType = detectCardType(body.card_number)

      // If this is the first card, make it default
      const isFirstCard = count === 0

      const card = await prisma.card.create({
        data: {
          userId,
          cardNumber: maskedNumber,
          cardHolder: body.card_holder.toUpperCase(),
          expiryMonth: body.expiry_month,
          expiryYear: body.expiry_year,
          cardType,
          isDefault: isFirstCard,
        },
      })

      return res.status(201).json({
        success: true,
        message: t('cardAdded'),
        data: {
          id: card.id,
          card_number: card.cardNumber,
          card_holder: card.cardHolder,
          expiry_month: card.expiryMonth,
          expiry_year: card.expiryYear,
          card_type: card.cardType,
          is_default: card.isDefault,
          created_at: card.createdAt,
        },
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: t('validationError'),
          errors: error.errors,
        })
      }

      console.error('Add card error:', error)
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
