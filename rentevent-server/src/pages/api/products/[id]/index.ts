import prisma from '@/lib/db'
import { withErrorHandler, ApiError } from '@/lib/api/error-handler'
import { createTranslator } from '@/lib/i18n'

export default withErrorHandler({ methods: ['GET'] }, async (req, res) => {
  const t = createTranslator(req)
  const { id } = req.query

  const product = await prisma.product.findUnique({
    where: { id: id as string },
    include: {
      pricingTiers: true,
      quantityPricing: true,
      category: true,
    },
  })

  if (!product || !product.isActive) {
    throw new ApiError(404, t('productNotFound'))
  }

  return res.status(200).json({
    success: true,
    data: {
      id: product.id,
      name: product.name,
      category_id: product.categoryId,
      photos: product.photos,
      specifications: {
        width: product.specWidth,
        height: product.specHeight,
        depth: product.specDepth,
        weight: product.specWeight,
        color: product.specColor,
        material: product.specMaterial,
      },
      daily_price: product.dailyPrice,
      pricing_tiers: product.pricingTiers.map((tier) => ({
        days: tier.days,
        total_price: tier.totalPrice,
      })),
      quantity_pricing: product.quantityPricing.map((qp) => ({
        quantity: qp.quantity,
        total_price: qp.totalPrice,
      })),
      total_stock: product.totalStock,
      min_rental_days: product.minRentalDays,
      max_rental_days: product.maxRentalDays,
      deposit_amount: product.depositAmount,
      is_active: product.isActive,
      created_at: product.createdAt,
    },
  })
})
