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

  if (req.method === 'GET') {
    try {
      const favorites = await prisma.favorite.findMany({
        where: { userId },
        include: {
          product: {
            include: {
              pricingTiers: true,
              quantityPricing: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return res.status(200).json({
        success: true,
        data: favorites.map((fav) => formatProduct(fav.product)),
      })
    } catch (error) {
      console.error('Get favorites error:', error)
      return res.status(500).json({
        success: false,
        message: t('internalServerError'),
      })
    }
  }

  if (req.method === 'POST') {
    try {
      const { product_id } = req.body

      if (!product_id) {
        return res.status(400).json({
          success: false,
          message: t('badRequest'),
        })
      }

      // Check if already favorited
      const existing = await prisma.favorite.findUnique({
        where: {
          userId_productId: { userId, productId: product_id },
        },
      })

      if (existing) {
        return res.status(400).json({
          success: false,
          message: t('alreadyInFavorites'),
        })
      }

      await prisma.favorite.create({
        data: {
          userId,
          productId: product_id,
        },
      })

      return res.status(201).json({
        success: true,
        message: t('addedToFavorites'),
      })
    } catch (error) {
      console.error('Add favorite error:', error)
      return res.status(500).json({
        success: false,
        message: t('internalServerError'),
      })
    }
  }

  return res.status(405).json({
    success: false,
    message: t('methodNotAllowed'),
  })
}

function formatProduct(product: any) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
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
    pricing_tiers: product.pricingTiers?.map((tier: any) => ({
      days: tier.days,
      total_price: tier.totalPrice,
    })) || [],
    quantity_pricing: product.quantityPricing?.map((qp: any) => ({
      quantity: qp.quantity,
      total_price: qp.totalPrice,
    })) || [],
    total_stock: product.totalStock,
    is_active: product.isActive,
    created_at: product.createdAt,
  }
}

export default withAuth(handler)
