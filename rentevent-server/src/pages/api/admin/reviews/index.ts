import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'
import { createTranslator } from '@/lib/i18n'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t = createTranslator(req)

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: t('methodNotAllowed'),
    })
  }

  const {
    page = '1',
    limit = '20',
    product_id,
    is_visible,
    rating,
  } = req.query

  const pageNum = parseInt(page as string, 10)
  const limitNum = Math.min(parseInt(limit as string, 10), 100)
  const skip = (pageNum - 1) * limitNum

  const where: any = {}

  if (product_id) {
    where.productId = product_id as string
  }

  if (is_visible !== undefined) {
    where.isVisible = is_visible === 'true'
  }

  if (rating) {
    where.rating = parseInt(rating as string, 10)
  }

  const [reviews, totalCount] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, phoneNumber: true } },
        product: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.review.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / limitNum)

  return res.status(200).json({
    success: true,
    data: reviews.map((review) => ({
      id: review.id,
      user_id: review.userId,
      user_name: review.user?.name || null,
      user_phone: review.user?.phoneNumber || null,
      product_id: review.productId,
      product_name: review.product?.name || null,
      order_id: review.orderId,
      rating: review.rating,
      comment: review.comment,
      photos: review.photos,
      is_visible: review.isVisible,
      created_at: review.createdAt,
      updated_at: review.updatedAt,
    })),
    pagination: {
      current_page: pageNum,
      limit: limitNum,
      total_count: totalCount,
      total_pages: totalPages,
      has_more: pageNum < totalPages,
    },
  })
}

export default requireAdminAuth(handler)
