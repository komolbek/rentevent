import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { withAuth } from '@/lib/auth/middleware'
import { ApiError } from '@/lib/api/error-handler'
import { createTranslator } from '@/lib/i18n'
import { z } from 'zod'

const createReviewSchema = z.object({
  product_id: z.string().min(1),
  order_id: z.string().min(1).optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
  photos: z.array(z.string()).max(5).optional(),
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
    const body = createReviewSchema.parse(req.body)

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: body.product_id },
    })

    if (!product) {
      return res.status(404).json({
        success: false,
        message: t('productNotFound'),
      })
    }

    // Check if user already reviewed this product
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: body.product_id,
        },
      },
    })

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this product',
      })
    }

    // Verify user has a completed order containing this product
    const completedOrder = await prisma.order.findFirst({
      where: {
        userId,
        status: { in: ['DELIVERED', 'RETURNED'] },
        items: { some: { productId: body.product_id } },
      },
    })

    if (!completedOrder) {
      return res.status(403).json({
        success: false,
        message: 'You can only review products from completed orders',
      })
    }

    const review = await prisma.review.create({
      data: {
        userId,
        productId: body.product_id,
        orderId: body.order_id || completedOrder.id,
        rating: body.rating,
        comment: body.comment,
        photos: body.photos || [],
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    })

    return res.status(201).json({
      success: true,
      data: formatReview(review),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: t('validationError'),
        errors: error.errors,
      })
    }

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      })
    }

    console.error('[API_ERROR] POST /api/reviews:', error)
    return res.status(500).json({
      success: false,
      message: t('internalServerError'),
    })
  }
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
