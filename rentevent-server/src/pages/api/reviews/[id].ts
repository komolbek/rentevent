import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { withAuth } from '@/lib/auth/middleware'
import { createTranslator } from '@/lib/i18n'
import { z } from 'zod'

const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(1000).optional().nullable(),
  photos: z.array(z.string()).max(5).optional(),
})

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const t = createTranslator(req)
  const { id } = req.query

  if (req.method === 'PUT') {
    try {
      const body = updateReviewSchema.parse(req.body)

      const review = await prisma.review.findUnique({
        where: { id: id as string },
      })

      if (!review) {
        return res.status(404).json({
          success: false,
          message: t('notFound'),
        })
      }

      if (review.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: t('forbidden'),
        })
      }

      const updated = await prisma.review.update({
        where: { id: id as string },
        data: {
          ...(body.rating !== undefined && { rating: body.rating }),
          ...(body.comment !== undefined && { comment: body.comment }),
          ...(body.photos !== undefined && { photos: body.photos }),
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      })

      return res.status(200).json({
        success: true,
        data: formatReview(updated),
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: t('validationError'),
          errors: error.errors,
        })
      }

      console.error('[API_ERROR] PUT /api/reviews/[id]:', error)
      return res.status(500).json({
        success: false,
        message: t('internalServerError'),
      })
    }
  }

  if (req.method === 'DELETE') {
    const review = await prisma.review.findUnique({
      where: { id: id as string },
    })

    if (!review) {
      return res.status(404).json({
        success: false,
        message: t('notFound'),
      })
    }

    if (review.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: t('forbidden'),
      })
    }

    await prisma.review.delete({
      where: { id: id as string },
    })

    return res.status(200).json({
      success: true,
      message: 'Review deleted',
    })
  }

  return res.status(405).json({
    success: false,
    message: t('methodNotAllowed'),
  })
}

function formatReview(review: any) {
  return {
    id: review.id,
    user_id: review.userId,
    user_name: review.user?.name || null,
    product_id: review.productId,
    order_id: review.orderId,
    rating: review.rating,
    comment: review.comment,
    photos: review.photos,
    is_visible: review.isVisible,
    created_at: review.createdAt,
    updated_at: review.updatedAt,
  }
}

export default withAuth(handler)
