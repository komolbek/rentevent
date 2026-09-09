import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'
import { createTranslator } from '@/lib/i18n'
import { z } from 'zod'

const updateExtensionSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  notes: z.string().max(500).optional().nullable(),
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
    const body = updateExtensionSchema.parse(req.body)
    const staffId = (req as any).staffId

    const extension = await prisma.rentalExtension.findUnique({
      where: { id: id as string },
      include: {
        order: true,
      },
    })

    if (!extension) {
      return res.status(404).json({
        success: false,
        message: t('notFound'),
      })
    }

    if (extension.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Extension has already been processed',
      })
    }

    // If approving, update the order's end date
    if (body.status === 'APPROVED') {
      await prisma.$transaction(async (tx) => {
        await tx.rentalExtension.update({
          where: { id: id as string },
          data: {
            status: 'APPROVED',
            notes: body.notes !== undefined ? body.notes : extension.notes,
            processedBy: staffId,
          },
        })

        await tx.order.update({
          where: { id: extension.orderId },
          data: {
            rentalEndDate: extension.newEndDate,
            updatedBy: staffId,
          },
        })
      })
    } else {
      await prisma.rentalExtension.update({
        where: { id: id as string },
        data: {
          status: 'REJECTED',
          notes: body.notes !== undefined ? body.notes : extension.notes,
          processedBy: staffId,
        },
      })
    }

    const updated = await prisma.rentalExtension.findUnique({
      where: { id: id as string },
      include: {
        order: {
          select: { id: true, orderNumber: true, rentalStartDate: true, rentalEndDate: true },
        },
        user: {
          select: { id: true, name: true, phoneNumber: true },
        },
      },
    })

    return res.status(200).json({
      success: true,
      data: {
        id: updated!.id,
        order_id: updated!.orderId,
        order_number: updated!.order?.orderNumber || null,
        order_end_date: updated!.order?.rentalEndDate || null,
        user_id: updated!.userId,
        user_name: updated!.user?.name || null,
        user_phone: updated!.user?.phoneNumber || null,
        original_end_date: updated!.originalEndDate,
        new_end_date: updated!.newEndDate,
        additional_days: updated!.additionalDays,
        additional_cost: updated!.additionalCost,
        status: updated!.status,
        notes: updated!.notes,
        processed_by: updated!.processedBy,
        created_at: updated!.createdAt,
        updated_at: updated!.updatedAt,
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

    console.error('[API_ERROR] PATCH /api/admin/extensions/[id]:', error)
    return res.status(500).json({
      success: false,
      message: t('internalServerError'),
    })
  }
}

export default requireAdminAuth(handler)
