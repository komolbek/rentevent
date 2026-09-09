import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'
import { createTranslator } from '@/lib/i18n'
import { z } from 'zod'

const updateReturnSchema = z.object({
  status: z.enum([
    'REQUESTED', 'APPROVED', 'PICKUP_SCHEDULED', 'PICKED_UP',
    'INSPECTED', 'REFUND_ISSUED', 'COMPLETED', 'REJECTED',
  ]).optional(),
  damage_level: z.enum(['NONE', 'MINOR', 'MODERATE', 'SEVERE']).optional(),
  damage_notes: z.string().max(1000).optional().nullable(),
  damage_fee: z.number().int().min(0).optional(),
  refund_amount: z.number().int().min(0).optional(),
  pickup_date: z.string().optional().nullable(),
  inspection_notes: z.string().max(1000).optional().nullable(),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t = createTranslator(req)
  const { id } = req.query

  if (req.method !== 'PATCH') {
    return res.status(405).json({
      success: false,
      message: t('methodNotAllowed'),
    })
  }

  try {
    const body = updateReturnSchema.parse(req.body)
    const staffId = (req as any).staffId

    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: id as string },
    })

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: t('notFound'),
      })
    }

    const updated = await prisma.returnRequest.update({
      where: { id: id as string },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.damage_level !== undefined && { damageLevel: body.damage_level }),
        ...(body.damage_notes !== undefined && { damageNotes: body.damage_notes }),
        ...(body.damage_fee !== undefined && { damageFee: body.damage_fee }),
        ...(body.refund_amount !== undefined && { refundAmount: body.refund_amount }),
        ...(body.pickup_date !== undefined && {
          pickupDate: body.pickup_date ? new Date(body.pickup_date) : null,
        }),
        ...(body.inspection_notes !== undefined && { inspectionNotes: body.inspection_notes }),
        processedBy: staffId,
      },
      include: {
        order: {
          select: { id: true, orderNumber: true, status: true, totalAmount: true },
        },
        user: {
          select: { id: true, name: true, phoneNumber: true },
        },
      },
    })

    // If status is COMPLETED, update order status to RETURNED
    if (body.status === 'COMPLETED') {
      await prisma.order.update({
        where: { id: updated.orderId },
        data: {
          status: 'RETURNED',
          updatedBy: staffId,
        },
      })

      await prisma.orderStatusHistory.create({
        data: {
          orderId: updated.orderId,
          status: 'RETURNED',
          notes: 'Return completed',
          createdBy: staffId,
        },
      })
    }

    return res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        order_id: updated.orderId,
        order_number: updated.order?.orderNumber || null,
        user_id: updated.userId,
        user_name: updated.user?.name || null,
        user_phone: updated.user?.phoneNumber || null,
        status: updated.status,
        reason: updated.reason,
        photos: updated.photos,
        damage_level: updated.damageLevel,
        damage_notes: updated.damageNotes,
        damage_fee: updated.damageFee,
        refund_amount: updated.refundAmount,
        pickup_date: updated.pickupDate,
        inspection_notes: updated.inspectionNotes,
        processed_by: updated.processedBy,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt,
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

    console.error('[API_ERROR] PATCH /api/admin/returns/[id]:', error)
    return res.status(500).json({
      success: false,
      message: t('internalServerError'),
    })
  }
}

export default requireAdminAuth(handler)
