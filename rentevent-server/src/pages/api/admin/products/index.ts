import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'
import { createTranslator } from '@/lib/i18n'
import { z } from 'zod'

const productSchema = z.object({
  name: z.string().min(1),
  category_id: z.string(),
  photos: z.array(z.string()).max(3).optional(),
  daily_price: z.number().int().positive(),
  total_stock: z.number().int().positive(),
  is_active: z.boolean().optional(),
  specifications: z.object({
    width: z.string().optional().nullable(),
    height: z.string().optional().nullable(),
    depth: z.string().optional().nullable(),
    weight: z.string().optional().nullable(),
    color: z.string().optional().nullable(),
    material: z.string().optional().nullable(),
  }).optional(),
  pricing_tiers: z.array(z.object({
    days: z.number().int().positive(),
    total_price: z.number().int().positive(),
  })).optional(),
  quantity_pricing: z.array(z.object({
    quantity: z.number().int().positive(),
    total_price: z.number().int().positive(),
  })).optional(),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t = createTranslator(req)

  if (req.method === 'GET') {
    try {
      const {
        page = '1',
        limit = '20',
        category_id,
        search,
        is_active,
      } = req.query

      const pageNum = parseInt(page as string, 10)
      const limitNum = Math.min(parseInt(limit as string, 10), 100)
      const skip = (pageNum - 1) * limitNum

      const where: any = {}

      if (category_id) {
        where.categoryId = category_id
      }

      if (search) {
        where.name = { contains: search as string, mode: 'insensitive' }
      }

      if (is_active !== undefined) {
        where.isActive = is_active === 'true'
      }

      const [products, totalCount] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: true,
            pricingTiers: true,
            quantityPricing: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.product.count({ where }),
      ])

      const totalPages = Math.ceil(totalCount / limitNum)

      return res.status(200).json({
        success: true,
        data: products.map(formatProduct),
        pagination: {
          current_page: pageNum,
          limit: limitNum,
          total_count: totalCount,
          total_pages: totalPages,
          has_more: pageNum < totalPages,
        },
      })
    } catch (error) {
      console.error('Admin get products error:', error)
      return res.status(500).json({
        success: false,
        message: t('internalServerError'),
      })
    }
  }

  if (req.method === 'POST') {
    try {
      const body = productSchema.parse(req.body)

      // Verify category exists
      const category = await prisma.category.findUnique({
        where: { id: body.category_id },
      })

      if (!category) {
        return res.status(400).json({
          success: false,
          message: t('categoryNotFound'),
        })
      }

      const product = await prisma.product.create({
        data: {
          name: body.name,
          categoryId: body.category_id,
          photos: body.photos || [],
          dailyPrice: body.daily_price,
          totalStock: body.total_stock,
          isActive: body.is_active ?? true,
          specWidth: body.specifications?.width,
          specHeight: body.specifications?.height,
          specDepth: body.specifications?.depth,
          specWeight: body.specifications?.weight,
          specColor: body.specifications?.color,
          specMaterial: body.specifications?.material,
          pricingTiers: body.pricing_tiers ? {
            create: body.pricing_tiers.map((tier) => ({
              days: tier.days,
              totalPrice: tier.total_price,
            })),
          } : undefined,
          quantityPricing: body.quantity_pricing ? {
            create: body.quantity_pricing.map((qp) => ({
              quantity: qp.quantity,
              totalPrice: qp.total_price,
            })),
          } : undefined,
        },
        include: {
          pricingTiers: true,
          quantityPricing: true,
          category: true,
        },
      })

      return res.status(201).json({
        success: true,
        data: formatProduct(product),
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: t('validationError'),
          errors: error.errors,
        })
      }

      console.error('Admin create product error:', error)
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
    category_id: product.categoryId,
    category_name: product.category?.name,
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

export default requireAdminAuth(handler)
