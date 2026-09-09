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
    status,
    search,
  } = req.query

  const pageNum = parseInt(page as string, 10)
  const limitNum = Math.min(parseInt(limit as string, 10), 100)
  const skip = (pageNum - 1) * limitNum

  const where: any = {}

  if (status) {
    where.status = status as string
  }

  if (search) {
    where.OR = [
      { order: { orderNumber: { contains: search as string, mode: 'insensitive' } } },
      { user: { name: { contains: search as string, mode: 'insensitive' } } },
      { user: { phoneNumber: { contains: search as string } } },
    ]
  }

  const [returns, totalCount] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      include: {
        order: {
          select: { id: true, orderNumber: true, status: true, totalAmount: true },
        },
        user: {
          select: { id: true, name: true, phoneNumber: true },
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
    data: returns.map((r) => ({
      id: r.id,
      order_id: r.orderId,
      order_number: r.order?.orderNumber || null,
      order_total: r.order?.totalAmount || null,
      user_id: r.userId,
      user_name: r.user?.name || null,
      user_phone: r.user?.phoneNumber || null,
      status: r.status,
      reason: r.reason,
      photos: r.photos,
      damage_level: r.damageLevel,
      damage_notes: r.damageNotes,
      damage_fee: r.damageFee,
      refund_amount: r.refundAmount,
      pickup_date: r.pickupDate,
      inspection_notes: r.inspectionNotes,
      processed_by: r.processedBy,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
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
