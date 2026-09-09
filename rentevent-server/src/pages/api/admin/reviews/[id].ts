import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'
import { createTranslator } from '@/lib/i18n'
import { z } from 'zod'

const toggleVisibilitySchema = z.object({
  is_visible: z.boolean(),
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
    const body = toggleVisibilitySchema.parse(req.body)

    const review = await prisma.review.findUnique({
      where: { id: id as string },
    })

    if (!review) {
      return res.status(404).json({
        success: false,
        message: t('notFound'),
      })
    }

    const updated = await prisma.review.update({
      where: { id: id as string },
      data: { isVisible: body.is_visible },
      include: {
        user: { select: { id: true, name: true, phoneNumber: true } },
        product: { select: { id: true, name: true } },
      },
    })

    return res.status(200).json({
      success: true,
      data: {
        id: updated.id,
        user_id: updated.userId,
        user_name: updated.user?.name || null,
        product_id: updated.productId,
        product_name: updated.product?.name || null,
        rating: updated.rating,
        comment: updated.comment,
        photos: updated.photos,
        is_visible: updated.isVisible,
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

    console.error('[API_ERROR] PATCH /api/admin/reviews/[id]:', error)
    return res.status(500).json({
      success: false,
      message: t('internalServerError'),
    })
  }
}

export default requireAdminAuth(handler)
