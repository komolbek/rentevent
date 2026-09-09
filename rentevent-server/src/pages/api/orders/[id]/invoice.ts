import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { withAuth } from '@/lib/auth/middleware'
import { createTranslator } from '@/lib/i18n'
import { generateInvoicePdf } from '@/lib/invoice/generate-invoice'

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

  const order = await prisma.order.findUnique({
    where: { id: id as string },
    include: {
      items: true,
      user: {
        select: { id: true, name: true, phoneNumber: true },
      },
      deliveryAddress: {
        select: { fullAddress: true },
      },
    },
  })

  if (!order) {
    return res.status(404).json({
      success: false,
      message: t('orderNotFound'),
    })
  }

  if (order.userId !== userId) {
    return res.status(403).json({
      success: false,
      message: t('forbidden'),
    })
  }

  // Get business settings for company info on the invoice
  const settings = await prisma.businessSettings.findUnique({
    where: { id: 'default' },
  })

  const pdfBuffer = generateInvoicePdf({
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    rentalStartDate: order.rentalStartDate,
    rentalEndDate: order.rentalEndDate,
    customerName: order.user.name || '',
    customerPhone: order.user.phoneNumber,
    deliveryType: order.deliveryType,
    deliveryAddress: order.deliveryAddress?.fullAddress || null,
    items: order.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      dailyPrice: item.dailyPrice,
      totalPrice: item.totalPrice,
    })),
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    totalAmount: order.totalAmount,
    totalSavings: order.totalSavings,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    businessName: settings?.name || 'RentEvent',
    businessPhone: settings?.phone || '',
    businessAddress: settings?.address || '',
  })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="invoice-${order.orderNumber}.pdf"`
  )
  res.setHeader('Content-Length', pdfBuffer.length)

  return res.send(pdfBuffer)
}

export default withAuth(handler)
