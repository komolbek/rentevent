import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { withErrorHandler } from '@/lib/api/error-handler'
import { createTranslator } from '@/lib/i18n'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t = createTranslator(req)

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: t('methodNotAllowed'),
    })
  }

  const { id } = req.query
  const {
    page = '1',
    limit = '20',
  } = req.query

  const pageNum = parseInt(page as string, 10)
  const limitNum = Math.min(parseInt(limit as string, 10), 100)
  const skip = (pageNum - 1) * limitNum

  // Verify product exists
  const product = await prisma.product.findUnique({
    where: { id: id as string },
  })

  if (!product) {
    return res.status(404).json({
      success: false,
      message: t('productNotFound'),
    })
  }

  const where = {
    productId: id as string,
    isVisible: true,
  }

  const [reviews, totalCount] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.review.count({ where }),
  ])

  // Calculate average rating
  const ratingAgg = await prisma.review.aggregate({
    where: { productId: id as string, isVisible: true },
    _avg: { rating: true },
    _count: { rating: true },
  })

  const totalPages = Math.ceil(totalCount / limitNum)

  return res.status(200).json({
    success: true,
    data: {
      reviews: reviews.map(formatReview),
      average_rating: ratingAgg._avg.rating ? Number(ratingAgg._avg.rating.toFixed(1)) : 0,
      total_reviews: ratingAgg._count.rating,
    },
    pagination: {
      current_page: pageNum,
      limit: limitNum,
      total_count: totalCount,
      total_pages: totalPages,
      has_more: pageNum < totalPages,
    },
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
    created_at: review.createdAt,
    updated_at: review.updatedAt,
  }
}

export default withErrorHandler({ methods: ['GET'] }, handler)
