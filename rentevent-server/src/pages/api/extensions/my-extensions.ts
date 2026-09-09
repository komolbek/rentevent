import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { withAuth } from '@/lib/auth/middleware'
import { createTranslator } from '@/lib/i18n'

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
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
    status,
  } = req.query

  const pageNum = parseInt(page as string, 10)
  const limitNum = Math.min(parseInt(limit as string, 10), 100)
  const skip = (pageNum - 1) * limitNum

  const where: any = { userId }

  if (status) {
    where.status = status as string
  }

  const [extensions, totalCount] = await Promise.all([
    prisma.rentalExtension.findMany({
      where,
      include: {
        order: {
          select: { id: true, orderNumber: true, rentalStartDate: true, rentalEndDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.rentalExtension.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / limitNum)

  return res.status(200).json({
    success: true,
    data: extensions.map((ext) => ({
      id: ext.id,
      order_id: ext.orderId,
      order_number: ext.order?.orderNumber || null,
      user_id: ext.userId,
      original_end_date: ext.originalEndDate,
      new_end_date: ext.newEndDate,
      additional_days: ext.additionalDays,
      additional_cost: ext.additionalCost,
      status: ext.status,
      notes: ext.notes,
      processed_by: ext.processedBy,
      created_at: ext.createdAt,
      updated_at: ext.updatedAt,
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

export default withAuth(handler)
