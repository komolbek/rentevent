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

  const { id } = req.query

  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: id as string },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          items: {
            select: {
              id: true,
              productName: true,
              productPhoto: true,
              quantity: true,
              totalPrice: true,
            },
          },
        },
      },
    },
  })

  if (!returnRequest) {
    return res.status(404).json({
      success: false,
      message: t('notFound'),
    })
  }

  if (returnRequest.userId !== userId) {
    return res.status(403).json({
      success: false,
      message: t('forbidden'),
    })
  }

  return res.status(200).json({
    success: true,
    data: {
      id: returnRequest.id,
      order_id: returnRequest.orderId,
      order_number: returnRequest.order?.orderNumber || null,
      order_total: returnRequest.order?.totalAmount || null,
      order_items: returnRequest.order?.items.map((item) => ({
        id: item.id,
        product_name: item.productName,
        product_photo: item.productPhoto,
        quantity: item.quantity,
        total_price: item.totalPrice,
      })) || [],
      user_id: returnRequest.userId,
      status: returnRequest.status,
      reason: returnRequest.reason,
      photos: returnRequest.photos,
      damage_level: returnRequest.damageLevel,
      damage_notes: returnRequest.damageNotes,
      damage_fee: returnRequest.damageFee,
      refund_amount: returnRequest.refundAmount,
      pickup_date: returnRequest.pickupDate,
      inspection_notes: returnRequest.inspectionNotes,
      processed_by: returnRequest.processedBy,
      created_at: returnRequest.createdAt,
      updated_at: returnRequest.updatedAt,
    },
  })
}

export default withAuth(handler)
