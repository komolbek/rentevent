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
      status,
      search,
    } = req.query

    const pageNum = parseInt(page as string, 10)
    const limitNum = Math.min(parseInt(limit as string, 10), 100)
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search as string } },
        { user: { phoneNumber: { contains: search as string } } },
        { user: { name: { contains: search as string, mode: 'insensitive' } } },
      ]
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: true,
          items: true,
          deliveryAddress: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.order.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limitNum)

    return res.status(200).json({
      success: true,
      data: orders.map((order) => ({
        id: order.id,
        order_number: order.orderNumber,
        status: order.status,
        user: {
          id: order.user.id,
          phone_number: order.user.phoneNumber,
          name: order.user.name,
        },
        items: order.items.map((item) => ({
          id: item.id,
          product_id: item.productId,
          product_name: item.productName,
          product_photo: item.productPhoto,
          quantity: item.quantity,
          daily_price: item.dailyPrice,
          total_price: item.totalPrice,
        })),
        items_count: order.items.length,
        total_quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
        total_amount: order.totalAmount,
        delivery_type: order.deliveryType,
        delivery_address: order.deliveryAddress?.fullAddress,
        rental_start_date: order.rentalStartDate,
        rental_end_date: order.rentalEndDate,
        payment_method: order.paymentMethod,
        payment_status: order.paymentStatus,
        created_at: order.createdAt,
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
    console.error('Admin get orders error:', error)
    return res.status(500).json({
      success: false,
      message: t('internalServerError'),
    })
  }
}

export default requireAdminAuth(handler)
