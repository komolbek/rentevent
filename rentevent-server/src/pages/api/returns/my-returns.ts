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

  const [returns, totalCount] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      include: {
        order: {
          select: { id: true, orderNumber: true, status: true, totalAmount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.returnRequest.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / limitNum)

  return res.status(200).json({
    success: true,
    data: returns.map(formatReturnRequest),
    pagination: {
      current_page: pageNum,
      limit: limitNum,
      total_count: totalCount,
      total_pages: totalPages,
      has_more: pageNum < totalPages,
    },
  })
}

function formatReturnRequest(r: any) {
  return {
    id: r.id,
    order_id: r.orderId,
    order_number: r.order?.orderNumber || null,
    order_total: r.order?.totalAmount || null,
    user_id: r.userId,
    status: r.status,
    reason: r.reason,
    photos: r.photos,
    damage_level: r.damageLevel,
    damage_notes: r.damageNotes,
    damage_fee: r.damageFee,
    refund_amount: r.refundAmount,
    pickup_date: r.pickupDate,
    inspection_notes: r.inspectionNotes,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  }
}

export default withAuth(handler)
