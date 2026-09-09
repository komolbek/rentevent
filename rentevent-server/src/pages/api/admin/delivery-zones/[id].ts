import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'
import { createTranslator } from '@/lib/i18n'
import { z } from 'zod'

const updateZoneSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  price: z.number().int().min(0).optional(),
  is_free: z.boolean().optional(),
  is_active: z.boolean().optional(),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t = createTranslator(req)
  const { id } = req.query

  if (req.method === 'PUT') {
    try {
      const body = updateZoneSchema.parse(req.body)

      const zone = await prisma.deliveryZone.findUnique({
        where: { id: id as string },
      })

      if (!zone) {
        return res.status(404).json({
          success: false,
          message: t('notFound'),
        })
      }

      const updated = await prisma.deliveryZone.update({
        where: { id: id as string },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.price !== undefined && { price: body.price }),
          ...(body.is_free !== undefined && { isFree: body.is_free }),
          ...(body.is_active !== undefined && { isActive: body.is_active }),
        },
      })

      return res.status(200).json({
        success: true,
        data: formatZone(updated),
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: t('validationError'),
          errors: error.errors,
        })
      }

      console.error('[API_ERROR] PUT /api/admin/delivery-zones/[id]:', error)
      return res.status(500).json({
        success: false,
        message: t('internalServerError'),
      })
    }
  }

  if (req.method === 'DELETE') {
    const zone = await prisma.deliveryZone.findUnique({
      where: { id: id as string },
    })

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: t('notFound'),
      })
    }

    await prisma.deliveryZone.delete({
      where: { id: id as string },
    })

    return res.status(200).json({
      success: true,
      message: 'Delivery zone deleted',
    })
  }

  return res.status(405).json({
    success: false,
    message: t('methodNotAllowed'),
  })
}

function formatZone(zone: any) {
  return {
    id: zone.id,
    name: zone.name,
    price: zone.price,
    is_free: zone.isFree,
    is_active: zone.isActive,
    created_at: zone.createdAt,
    updated_at: zone.updatedAt,
  }
}

export default requireAdminAuth(handler)
