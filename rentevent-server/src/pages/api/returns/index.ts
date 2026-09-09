import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { withAuth } from '@/lib/auth/middleware'
import { createTranslator } from '@/lib/i18n'
import { z } from 'zod'

const createReturnSchema = z.object({
  order_id: z.string().min(1),
  reason: z.string().max(1000).optional().nullable(),
  photos: z.array(z.string()).max(10).optional(),
})

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

  try {
    const body = createReturnSchema.parse(req.body)

    // Verify order exists, belongs to user, and is DELIVERED
    const order = await prisma.order.findUnique({
      where: { id: body.order_id },
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: t('orderNotFound'),
      })
    }

    if (order.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: t('forbidden'),
      })
    }

    if (order.status !== 'DELIVERED') {
      return res.status(400).json({
        success: false,
        message: 'Return can only be requested for delivered orders',
      })
    }

    // Check if there's already an active return request for this order
    const existingReturn = await prisma.returnRequest.findFirst({
      where: {
        orderId: body.order_id,
        status: { notIn: ['REJECTED', 'COMPLETED'] },
      },
    })

    if (existingReturn) {
      return res.status(409).json({
        success: false,
        message: 'A return request already exists for this order',
      })
    }

    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: body.order_id,
        userId,
        reason: body.reason,
        photos: body.photos || [],
      },
      include: {
        order: {
          select: { id: true, orderNumber: true, status: true },
        },
      },
    })

    return res.status(201).json({
      success: true,
      data: formatReturnRequest(returnRequest),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: t('validationError'),
        errors: error.errors,
      })
    }

    console.error('[API_ERROR] POST /api/returns:', error)
    return res.status(500).json({
      success: false,
      message: t('internalServerError'),
    })
  }
}

function formatReturnRequest(r: any) {
  return {
    id: r.id,
    order_id: r.orderId,
    order_number: r.order?.orderNumber || null,
    user_id: r.userId,
    status: r.status,
    reason: r.reason,
    photos: r.photos,
    damage_level: r.damageLevel,
    damage_notes: r.damageNotes,
    damage_fee: r.damageFee,
    refund_amount: r.refundAmount,
    pickup_date: r.pickupDate,
    inspection_notes: r.inspectionNotes,
    processed_by: r.processedBy,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  }
}

export default withAuth(handler)
