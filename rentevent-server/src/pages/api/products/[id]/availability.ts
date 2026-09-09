import prisma from '@/lib/db'
import { withErrorHandler, ApiError } from '@/lib/api/error-handler'
import { createTranslator } from '@/lib/i18n'

export default withErrorHandler({ methods: ['GET'] }, async (req, res) => {
  const t = createTranslator(req)
  const { id, start_date, end_date } = req.query

  if (!start_date || !end_date) {
    throw new ApiError(400, 'start_date and end_date query parameters are required')
  }

  const productId = id as string
  const startDate = new Date(start_date as string)
  const endDate = new Date(end_date as string)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new ApiError(400, t('invalidDates'))
  }

  if (startDate > endDate) {
    throw new ApiError(400, t('invalidDates'))
  }

  // Max range: 90 days
  const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays > 90) {
    throw new ApiError(400, 'Date range cannot exceed 90 days')
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, totalStock: true, isActive: true },
  })

  if (!product || !product.isActive) {
    throw new ApiError(404, t('productNotFound'))
  }

  // Get all overlapping orders for this product in the date range
  const overlappingOrders = await prisma.order.findMany({
    where: {
      status: { in: ['CONFIRMED', 'PREPARING', 'DELIVERED'] },
      rentalStartDate: { lte: endDate },
      rentalEndDate: { gte: startDate },
      items: { some: { productId } },
    },
    select: {
      rentalStartDate: true,
      rentalEndDate: true,
      items: {
        where: { productId },
        select: { quantity: true },
      },
    },
  })

  // Build day-by-day availability calendar
  const availability: { date: string; available_stock: number }[] = []

  const currentDate = new Date(startDate)
  currentDate.setHours(0, 0, 0, 0)

  const endDateNorm = new Date(endDate)
  endDateNorm.setHours(0, 0, 0, 0)

  while (currentDate <= endDateNorm) {
    let reservedQty = 0
    for (const order of overlappingOrders) {
      const orderStart = new Date(order.rentalStartDate)
      orderStart.setHours(0, 0, 0, 0)
      const orderEnd = new Date(order.rentalEndDate)
      orderEnd.setHours(0, 0, 0, 0)

      if (currentDate >= orderStart && currentDate <= orderEnd) {
        reservedQty += order.items.reduce((sum, item) => sum + item.quantity, 0)
      }
    }

    availability.push({
      date: currentDate.toISOString().split('T')[0],
      available_stock: Math.max(0, product.totalStock - reservedQty),
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return res.status(200).json({
    success: true,
    data: {
      product_id: product.id,
      total_stock: product.totalStock,
      availability,
    },
  })
})
