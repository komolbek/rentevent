import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'
import { createTranslator } from '@/lib/i18n'
import { z } from 'zod'
import { deleteFileFromUploadthing } from '@/lib/upload/uploadthing'

// Helper to check if URL is from Uploadthing
function isUploadthingUrl(url: string): boolean {
  return url.includes('uploadthing') || url.includes('utfs.io') || url.includes('ufs.sh')
}

// Delete images from storage (Uploadthing or local)
async function deleteImages(urls: string[]): Promise<void> {
  for (const url of urls) {
    if (isUploadthingUrl(url)) {
      await deleteFileFromUploadthing(url)
    }
    // Local files in /uploads are not deleted automatically
    // They would need fs.unlink but that's less critical for dev
  }
}

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  category_id: z.string().optional(),
  photos: z.array(z.string()).max(3).optional(),
  daily_price: z.number().int().positive().optional(),
  total_stock: z.number().int().positive().optional(),
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
  const { productId } = req.query

  if (!productId || typeof productId !== 'string') {
    return res.status(400).json({
      success: false,
      message: t('badRequest'),
    })
  }

  // GET - Get single product
  if (req.method === 'GET') {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          pricingTiers: true,
          quantityPricing: true,
        },
      })

      if (!product) {
        return res.status(404).json({
          success: false,
          message: t('productNotFound'),
        })
      }

      return res.status(200).json({
        success: true,
        data: formatProduct(product),
      })
    } catch (error) {
      console.error('Admin get product error:', error)
      return res.status(500).json({
        success: false,
        message: t('internalServerError'),
      })
    }
  }

  // PUT - Update product
  if (req.method === 'PUT') {
    try {
      const body = updateProductSchema.parse(req.body)

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id: productId },
      })

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: t('productNotFound'),
        })
      }

      // If category_id is provided, verify it exists
      if (body.category_id) {
        const category = await prisma.category.findUnique({
          where: { id: body.category_id },
        })

        if (!category) {
          return res.status(400).json({
            success: false,
            message: t('categoryNotFound'),
          })
        }
      }

      // Build update data
      const updateData: any = {}

      if (body.name !== undefined) updateData.name = body.name
      if (body.category_id !== undefined) updateData.categoryId = body.category_id
      if (body.daily_price !== undefined) updateData.dailyPrice = body.daily_price
      if (body.total_stock !== undefined) updateData.totalStock = body.total_stock
      if (body.is_active !== undefined) updateData.isActive = body.is_active

      // Handle photo updates - delete removed images from storage
      if (body.photos !== undefined) {
        const oldPhotos = existingProduct.photos as string[]
        const newPhotos = body.photos
        const removedPhotos = oldPhotos.filter(url => !newPhotos.includes(url))

        // Delete removed images from Uploadthing (async, don't block response)
        if (removedPhotos.length > 0) {
          deleteImages(removedPhotos).catch(err => {
            console.error('Failed to delete removed images:', err)
          })
        }

        updateData.photos = body.photos
      }

      if (body.specifications) {
        if (body.specifications.width !== undefined) updateData.specWidth = body.specifications.width
        if (body.specifications.height !== undefined) updateData.specHeight = body.specifications.height
        if (body.specifications.depth !== undefined) updateData.specDepth = body.specifications.depth
        if (body.specifications.weight !== undefined) updateData.specWeight = body.specifications.weight
        if (body.specifications.color !== undefined) updateData.specColor = body.specifications.color
        if (body.specifications.material !== undefined) updateData.specMaterial = body.specifications.material
      }

      // Update product with pricing tiers in a transaction
      const product = await prisma.$transaction(async (tx) => {
        // Delete existing pricing tiers if new ones provided
        if (body.pricing_tiers !== undefined) {
          await tx.pricingTier.deleteMany({
            where: { productId },
          })
        }

        // Delete existing quantity pricing if new ones provided
        if (body.quantity_pricing !== undefined) {
          await tx.quantityPricing.deleteMany({
            where: { productId },
          })
        }

        // Update product
        return tx.product.update({
          where: { id: productId },
          data: {
            ...updateData,
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
            category: true,
            pricingTiers: true,
            quantityPricing: true,
          },
        })
      })

      return res.status(200).json({
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

      console.error('Admin update product error:', error)
      return res.status(500).json({
        success: false,
        message: t('internalServerError'),
      })
    }
  }

  // DELETE - Delete product
  if (req.method === 'DELETE') {
    try {
      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          orderItems: { take: 1 },
        },
      })

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: t('productNotFound'),
        })
      }

      // If product has orders, just deactivate it instead of deleting
      if (existingProduct.orderItems.length > 0) {
        await prisma.product.update({
          where: { id: productId },
          data: { isActive: false },
        })

        return res.status(200).json({
          success: true,
          message: 'Product deactivated (has order history)',
          deactivated: true,
        })
      }

      // Get photos to delete from storage
      const photosToDelete = existingProduct.photos as string[]

      // Delete product and related data
      await prisma.$transaction([
        prisma.pricingTier.deleteMany({ where: { productId } }),
        prisma.quantityPricing.deleteMany({ where: { productId } }),
        prisma.favorite.deleteMany({ where: { productId } }),
        prisma.product.delete({ where: { id: productId } }),
      ])

      // Delete images from Uploadthing (async, don't block response)
      if (photosToDelete.length > 0) {
        deleteImages(photosToDelete).catch(err => {
          console.error('Failed to delete product images:', err)
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Product deleted',
      })
    } catch (error) {
      console.error('Admin delete product error:', error)
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
