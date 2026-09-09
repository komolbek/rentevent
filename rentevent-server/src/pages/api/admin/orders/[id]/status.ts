import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'
import { createTranslator } from '@/lib/i18n'
import { OrderStatus } from '@prisma/client'

// Valid status transitions — only these are allowed
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['RETURNED'],
  RETURNED: [],
  CANCELLED: [],
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t = createTranslator(req)
  const { id } = req.query

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: t('methodNotAllowed'),
    })
  }

  try {
    const { status, notes } = req.body

    if (!status || !Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: t('badRequest'),
      })
    }

    const order = await prisma.order.findUnique({
      where: { id: id as string },
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: t('orderNotFound'),
      })
    }

    // Validate status transition
    const allowedNextStatuses = VALID_TRANSITIONS[order.status as OrderStatus] || []
    if (!allowedNextStatuses.includes(status as OrderStatus)) {
      return res.status(400).json({
        success: false,
        message: t('invalidStatusTransition'),
      })
    }

    // Update order status with actual staff identity
    const staffId = (req as any).staffId as string
    const updatedOrder = await prisma.order.update({
      where: { id: id as string },
      data: {
        status,
        updatedBy: staffId,
        statusHistory: {
          create: {
            status,
            notes,
            createdBy: staffId,
          },
        },
      },
      include: {
        items: true,
        user: true,
        deliveryAddress: true,
      },
    })

    return res.status(200).json({
      success: true,
      message: t('orderUpdated'),
      data: {
        id: updatedOrder.id,
        order_number: updatedOrder.orderNumber,
        status: updatedOrder.status,
      },
    })
  } catch (error) {
    console.error('Update order status error:', error)
    return res.status(500).json({
      success: false,
      message: t('internalServerError'),
    })
  }
}

export default requireAdminAuth(handler)
