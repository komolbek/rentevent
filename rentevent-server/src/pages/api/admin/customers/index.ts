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

  try {
    const {
      page = '1',
      limit = '20',
      search,
    } = req.query

    const pageNum = parseInt(page as string, 10)
    const limitNum = Math.min(parseInt(limit as string, 10), 100)
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phoneNumber: { contains: search as string } },
      ]
    }

    const [customers, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          orders: {
            select: {
              id: true,
              totalAmount: true,
            },
          },
          _count: {
            select: {
              orders: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limitNum)

    return res.status(200).json({
      success: true,
      data: customers.map((customer) => ({
        id: customer.id,
        name: customer.name || 'Без имени',
        phone_number: customer.phoneNumber,
        is_active: customer.isActive,
        created_at: customer.createdAt,
        total_orders: customer._count.orders,
        total_spent: customer.orders.reduce((sum, order) => sum + order.totalAmount, 0),
      })),
      pagination: {
        current_page: pageNum,
        limit: limitNum,
        total_count: totalCount,
        total_pages: totalPages,
        has_more: pageNum < totalPages,
      },
    })
  } catch (error) {
    console.error('Admin get customers error:', error)
    return res.status(500).json({
      success: false,
      message: t('internalServerError'),
    })
  }
}

export default requireAdminAuth(handler)
