import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'
import { createTranslator } from '@/lib/i18n'
import { z } from 'zod'

const createZoneSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().int().min(0),
  is_free: z.boolean().optional(),
  is_active: z.boolean().optional(),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t = createTranslator(req)

  if (req.method === 'GET') {
    const { is_active, search } = req.query

    const where: any = {}

    if (is_active !== undefined) {
      where.isActive = is_active === 'true'
    }

    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' }
    }

    const zones = await prisma.deliveryZone.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    return res.status(200).json({
      success: true,
      data: zones.map(formatZone),
    })
  }

  if (req.method === 'POST') {
    try {
      const body = createZoneSchema.parse(req.body)

      const zone = await prisma.deliveryZone.create({
        data: {
          name: body.name,
          price: body.is_free ? 0 : body.price,
          isFree: body.is_free ?? false,
          isActive: body.is_active ?? true,
        },
      })

      return res.status(201).json({
        success: true,
        data: formatZone(zone),
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: t('validationError'),
          errors: error.errors,
        })
      }

      console.error('[API_ERROR] POST /api/admin/delivery-zones:', error)
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
