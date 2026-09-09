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
  const { id } = req.query

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: t('methodNotAllowed'),
    })
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      message: t('badRequest'),
    })
  }

  try {
    const order = await prisma.order.findFirst({
      where: {
        id,
        userId, // Ensure user can only access their own orders
      },
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
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: t('orderNotFound'),
      })
    }

    return res.status(200).json({
      success: true,
      data: formatOrder(order),
    })
  } catch (error) {
    console.error('Get order error:', error)
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
    status_history: order.statusHistory?.map((h: any) => ({
      id: h.id,
      status: h.status,
      notes: h.notes,
      created_at: h.createdAt,
    })),
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  }
}

export default withAuth(handler)
