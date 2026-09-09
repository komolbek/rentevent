import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { withAuth } from '@/lib/auth/middleware'
import { createTranslator } from '@/lib/i18n'
import { z } from 'zod'

const createExtensionSchema = z.object({
  order_id: z.string().min(1),
  additional_days: z.number().int().min(1).max(365),
  notes: z.string().max(500).optional().nullable(),
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
    const body = createExtensionSchema.parse(req.body)

    // Verify order exists, belongs to user, and is active/delivered
    const order = await prisma.order.findUnique({
      where: { id: body.order_id },
      include: {
        items: {
          include: {
            product: { select: { dailyPrice: true } },
          },
        },
      },
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

    if (!['CONFIRMED', 'PREPARING', 'DELIVERED'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Extension can only be requested for active or delivered orders',
      })
    }

    // Check if there's already a pending extension for this order
    const existingExtension = await prisma.rentalExtension.findFirst({
      where: {
        orderId: body.order_id,
        status: 'PENDING',
      },
    })

    if (existingExtension) {
      return res.status(409).json({
        success: false,
        message: 'A pending extension request already exists for this order',
      })
    }

    // Calculate additional cost based on daily prices of items
    const additionalCost = order.items.reduce((sum, item) => {
      return sum + (item.product.dailyPrice * item.quantity * body.additional_days)
    }, 0)

    const originalEndDate = order.rentalEndDate
    const newEndDate = new Date(originalEndDate)
    newEndDate.setDate(newEndDate.getDate() + body.additional_days)

    const extension = await prisma.rentalExtension.create({
      data: {
        orderId: body.order_id,
        userId,
        originalEndDate,
        newEndDate,
        additionalDays: body.additional_days,
        additionalCost,
        notes: body.notes,
      },
      include: {
        order: {
          select: { id: true, orderNumber: true, rentalEndDate: true },
        },
      },
    })

    return res.status(201).json({
      success: true,
      data: formatExtension(extension),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: t('validationError'),
        errors: error.errors,
      })
    }

    console.error('[API_ERROR] POST /api/extensions:', error)
    return res.status(500).json({
      success: false,
      message: t('internalServerError'),
    })
  }
}

function formatExtension(ext: any) {
  return {
    id: ext.id,
    order_id: ext.orderId,
    order_number: ext.order?.orderNumber || null,
    user_id: ext.userId,
    original_end_date: ext.originalEndDate,
    new_end_date: ext.newEndDate,
    additional_days: ext.additionalDays,
    additional_cost: ext.additionalCost,
    status: ext.status,
    notes: ext.notes,
    processed_by: ext.processedBy,
    created_at: ext.createdAt,
    updated_at: ext.updatedAt,
  }
}

export default withAuth(handler)
