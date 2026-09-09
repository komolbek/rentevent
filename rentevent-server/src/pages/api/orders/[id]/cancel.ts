import prisma from '@/lib/db'
import { withAuth } from '@/lib/auth/middleware'
import { ApiError } from '@/lib/api/error-handler'
import { createTranslator } from '@/lib/i18n'
import type { NextApiRequest, NextApiResponse } from 'next'

const HOURS_48 = 48 * 60 * 60 * 1000

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const t = createTranslator(req)
  const { id } = req.query

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: t('methodNotAllowed'),
    })
  }

  const order = await prisma.order.findFirst({
    where: { id: id as string, userId },
  })

  if (!order) {
    throw new ApiError(404, t('orderNotFound'))
  }

  // Only CONFIRMED or PREPARING orders can be cancelled
  if (!['CONFIRMED', 'PREPARING'].includes(order.status)) {
    return res.status(400).json({
      success: false,
      message: 'Only confirmed or preparing orders can be cancelled',
    })
  }

  // Calculate cancellation fee based on policy:
  // - Free if 48+ hours before rental start
  // - 30% if less than 48 hours
  // - 50% if same day as rental start
  const now = new Date()
  const rentalStart = new Date(order.rentalStartDate)
  const hoursUntilStart = rentalStart.getTime() - now.getTime()

  let cancellationFeePercent = 0
  if (hoursUntilStart < 0) {
    // Already past start date
    return res.status(400).json({
      success: false,
      message: 'Cannot cancel an order after the rental period has started',
    })
  } else if (hoursUntilStart < 24 * 60 * 60 * 1000) {
    cancellationFeePercent = 50
  } else if (hoursUntilStart < HOURS_48) {
    cancellationFeePercent = 30
  }

  const cancellationFee = Math.round(order.totalAmount * cancellationFeePercent / 100)

  const updatedOrder = await prisma.order.update({
    where: { id: id as string },
    data: {
      status: 'CANCELLED',
      adminNotes: cancellationFeePercent > 0
        ? `Cancellation fee: ${cancellationFeePercent}% (${cancellationFee} UZS)`
        : 'Free cancellation (48+ hours before start)',
      statusHistory: {
        create: {
          status: 'CANCELLED',
          notes: `Cancelled by user. Fee: ${cancellationFeePercent}%`,
          createdBy: userId,
        },
      },
    },
  })

  return res.status(200).json({
    success: true,
    message: 'Order cancelled',
    data: {
      id: updatedOrder.id,
      status: updatedOrder.status,
      cancellation_fee_percent: cancellationFeePercent,
      cancellation_fee: cancellationFee,
    },
  })
}

export default withAuth(handler)
