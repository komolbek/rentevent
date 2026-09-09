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

  try {
    const {
      page = '1',
      limit = '20',
      status,
    } = req.query

    const pageNum = parseInt(page as string, 10)
    const limitNum = Math.min(parseInt(limit as string, 10), 50)
    const skip = (pageNum - 1) * limitNum

    const where: any = { userId }
    if (status) {
      where.status = status
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  photos: true,
                },
              },
            },
          },
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
      data: orders.map(formatOrder),
      pagination: {
        current_page: pageNum,
        limit: limitNum,
        total_count: totalCount,
        total_pages: totalPages,
        has_more: pageNum < totalPages,
      },
    })
  } catch (error) {
    console.error('Get orders error:', error)
    return res.status(500).json({
      success: false,
      message: t('internalServerError'),
    })
  }
}

function formatOrder(order: any) {
  return {
    id: order.id,
    order_number: order.orderNumber,
    user_id: order.userId,
    status: order.status,
    items: order.items.map((item: any) => ({
      id: item.id,
      product_id: item.productId,
      product_name: item.productName,
      // Use stored photo, fallback to current product photo if stored is null
      product_photo: item.productPhoto || (item.product?.photos?.[0] ?? null),
      quantity: item.quantity,
      daily_price: item.dailyPrice,
      total_price: item.totalPrice,
      savings: item.savings,
    })),
    delivery_type: order.deliveryType,
    delivery_address: order.deliveryAddress ? {
      id: order.deliveryAddress.id,
      user_id: order.deliveryAddress.userId,
      title: order.deliveryAddress.title,
      full_address: order.deliveryAddress.fullAddress,
      city: order.deliveryAddress.city,
      district: order.deliveryAddress.district,
      street: order.deliveryAddress.street,
      building: order.deliveryAddress.building,
      apartment: order.deliveryAddress.apartment,
      entrance: order.deliveryAddress.entrance,
      floor: order.deliveryAddress.floor,
      latitude: order.deliveryAddress.latitude ? Number(order.deliveryAddress.latitude) : null,
      longitude: order.deliveryAddress.longitude ? Number(order.deliveryAddress.longitude) : null,
      is_default: order.deliveryAddress.isDefault,
      created_at: order.deliveryAddress.createdAt,
    } : null,
    delivery_fee: order.deliveryFee,
    subtotal: order.subtotal,
    total_amount: order.totalAmount,
    total_savings: order.totalSavings,
    rental_start_date: order.rentalStartDate,
    rental_end_date: order.rentalEndDate,
    payment_method: order.paymentMethod,
    payment_status: order.paymentStatus,
    notes: order.notes,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  }
}

export default withAuth(handler)
