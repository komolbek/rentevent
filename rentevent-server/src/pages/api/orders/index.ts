import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { withAuth } from '@/lib/auth/middleware'
import { ApiError } from '@/lib/api/error-handler'
import { createTranslator } from '@/lib/i18n'
import { z } from 'zod'

const createOrderSchema = z.object({
  items: z.array(z.object({
    product_id: z.string(),
    quantity: z.number().int().positive(),
  })).min(1),
  delivery_type: z.enum(['DELIVERY', 'SELF_PICKUP']),
  delivery_address_id: z.string().optional().nullable(),
  rental_start_date: z.string(),
  rental_end_date: z.string(),
  payment_method: z.enum(['PAYME', 'CLICK', 'UZUM']),
  card_id: z.string().optional().nullable(), // For future use with saved cards
  notes: z.string().optional().nullable(),
})

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const t = createTranslator(req)

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: t('methodNotAllowed'),
    })
  }

  try {
    const body = createOrderSchema.parse(req.body)

    const startDate = new Date(body.rental_start_date)
    const endDate = new Date(body.rental_end_date)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: t('invalidDates'),
      })
    }

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: t('invalidDates'),
      })
    }

    // Start date must be today or in the future (compare date only, not time)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startDateOnly = new Date(startDate)
    startDateOnly.setHours(0, 0, 0, 0)
    if (startDateOnly < today) {
      return res.status(400).json({
        success: false,
        message: t('startDateInPast'),
      })
    }

    // Validate delivery address if delivery type is DELIVERY
    if (body.delivery_type === 'DELIVERY') {
      if (!body.delivery_address_id) {
        return res.status(400).json({
          success: false,
          message: t('addressRequired'),
        })
      }

      const address = await prisma.address.findFirst({
        where: { id: body.delivery_address_id, userId },
      })

      if (!address) {
        return res.status(400).json({
          success: false,
          message: t('addressRequired'),
        })
      }
    }

    // For now, online payments (Payme, Click, Uzum) are mock
    // In production, this would redirect to payment provider or process via API
    // Card validation is optional for future saved cards feature
    let userCard = null
    if (body.card_id) {
      userCard = await prisma.card.findFirst({
        where: { id: body.card_id, userId },
      })
    }

    const productIds = body.items.map((item) => item.product_id)

    // Calculate rental days (inclusive of both start and end dates)
    const rentalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

    if (rentalDays < 1) {
      return res.status(400).json({
        success: false,
        message: t('minRentalDays'),
      })
    }

    // Hard cap at 365 days to prevent abuse
    if (rentalDays > 365) {
      return res.status(400).json({
        success: false,
        message: t('rentalTooLong'),
      })
    }

    // Calculate delivery fee (can be done outside transaction — read-only, no race)
    let deliveryFee = 0
    if (body.delivery_type === 'DELIVERY' && body.delivery_address_id) {
      const address = await prisma.address.findUnique({
        where: { id: body.delivery_address_id },
      })
      if (address) {
        const cityLower = address.city.toLowerCase().trim()
        const isTashkent = cityLower === 'ташкент' || cityLower === 'tashkent' || cityLower === 'тошкент'
        if (!isTashkent) {
          const zone = await prisma.deliveryZone.findFirst({
            where: { name: address.city, isActive: true },
          })
          if (!zone) {
            return res.status(400).json({
              success: false,
              message: t('deliveryNotAvailable'),
            })
          }
          deliveryFee = zone.price
        }
      }
    }

    // Atomic transaction: lock products, check availability, create order
    const order = await prisma.$transaction(async (tx) => {
      // Lock product rows to prevent concurrent overbooking
      await tx.$queryRawUnsafe(
        `SELECT id FROM products WHERE id IN (${productIds.map((_, i) => `$${i + 1}`).join(',')}) FOR UPDATE`,
        ...productIds
      )

      // Fetch products with pricing data inside the transaction
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        include: {
          pricingTiers: true,
          quantityPricing: true,
        },
      })

      if (products.length !== productIds.length) {
        throw new ApiError(400, t('productNotFound'))
      }

      // Validate rental duration against product constraints
      for (const product of products) {
        if (rentalDays < product.minRentalDays) {
          throw new ApiError(
            400,
            `${product.name}: minimum rental is ${product.minRentalDays} day(s)`
          )
        }
        if (rentalDays > product.maxRentalDays) {
          throw new ApiError(
            400,
            `${product.name}: maximum rental is ${product.maxRentalDays} day(s)`
          )
        }
      }

      // Check availability and calculate prices
      let subtotal = 0
      let totalSavings = 0
      const orderItems: any[] = []

      for (const item of body.items) {
        const product = products.find((p) => p.id === item.product_id)!

        const reservedQty = await getReservedQuantity(
          tx,
          item.product_id,
          startDate,
          endDate
        )
        if (product.totalStock - reservedQty < item.quantity) {
          throw new ApiError(400, t('insufficientStock'))
        }

        const { totalPrice, savings } = calculateItemPrice(
          product,
          item.quantity,
          rentalDays
        )

        subtotal += totalPrice
        totalSavings += savings

        orderItems.push({
          productId: item.product_id,
          productName: product.name,
          productPhoto: product.photos[0] || null,
          quantity: item.quantity,
          dailyPrice: product.dailyPrice,
          totalPrice,
          savings,
        })
      }

      // Generate order number inside transaction to prevent duplicates
      const orderNumber = await generateOrderNumber(tx)

      return tx.order.create({
        data: {
          orderNumber,
          userId,
          status: 'CONFIRMED',
          deliveryType: body.delivery_type,
          deliveryAddressId: body.delivery_address_id,
          deliveryFee,
          subtotal,
          totalAmount: subtotal + deliveryFee,
          totalSavings,
          rentalStartDate: startDate,
          rentalEndDate: endDate,
          paymentMethod: body.payment_method,
          paymentStatus: 'PENDING',
          notes: body.notes,
          items: {
            create: orderItems,
          },
          statusHistory: {
            create: {
              status: 'CONFIRMED',
              notes: 'Order created',
            },
          },
        },
        include: {
          items: true,
          deliveryAddress: true,
        },
      })
    }, {
      isolationLevel: 'Serializable',
      timeout: 10000,
    })

    return res.status(201).json({
      success: true,
      message: t('orderCreated'),
      data: formatOrder(order),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: t('validationError'),
        errors: error.errors,
      })
    }

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      })
    }

    console.error('[API_ERROR] POST /api/orders:', error)
    return res.status(500).json({
      success: false,
      message: t('internalServerError'),
    })
  }
}

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

async function getReservedQuantity(
  tx: TxClient,
  productId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const overlappingOrders = await tx.order.findMany({
    where: {
      status: { in: ['CONFIRMED', 'PREPARING', 'DELIVERED'] },
      rentalStartDate: { lte: endDate },
      rentalEndDate: { gte: startDate },
      items: { some: { productId } },
    },
    include: {
      items: { where: { productId } },
    },
  })

  return overlappingOrders.reduce((sum, order) => {
    return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
  }, 0)
}

function calculateItemPrice(
  product: any,
  quantity: number,
  rentalDays: number
): { totalPrice: number; savings: number } {
  const fullPrice = product.dailyPrice * quantity * rentalDays

  if (rentalDays === 1) {
    // Use quantity pricing
    const tier = product.quantityPricing?.find((qp: any) => qp.quantity === quantity)
    if (tier) {
      return {
        totalPrice: tier.totalPrice,
        savings: fullPrice - tier.totalPrice,
      }
    }
  } else {
    // Use day pricing
    const tier = product.pricingTiers?.find((pt: any) => pt.days === rentalDays)
    if (tier) {
      const totalPrice = tier.totalPrice * quantity
      return {
        totalPrice,
        savings: fullPrice - totalPrice,
      }
    }
  }

  return { totalPrice: fullPrice, savings: 0 }
}

async function generateOrderNumber(tx: TxClient): Promise<string> {
  const date = new Date()
  const prefix = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`

  // Atomic increment via upsert — no race condition
  const counter = await tx.orderCounter.upsert({
    where: { id: prefix },
    update: { counter: { increment: 1 } },
    create: { id: prefix, counter: 1 },
  })

  return `${prefix}${String(counter.counter).padStart(4, '0')}`
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
      product_photo: item.productPhoto,
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
