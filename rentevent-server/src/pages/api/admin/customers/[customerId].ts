import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'
import { createTranslator } from '@/lib/i18n'
import { z } from 'zod'

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
  admin_note: z.string().optional().nullable(),
})

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t = createTranslator(req)
  const { customerId } = req.query

  if (!customerId || typeof customerId !== 'string') {
    return res.status(400).json({
      success: false,
      message: t('badRequest'),
    })
  }

  // GET - Get single customer with orders
  if (req.method === 'GET') {
    try {
      const customer = await prisma.user.findUnique({
        where: { id: customerId },
        include: {
          orders: {
            orderBy: { createdAt: 'desc' },
            include: {
              items: true,
            },
          },
          addresses: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
      })

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Клиент не найден',
        })
      }

      return res.status(200).json({
        success: true,
        data: {
          id: customer.id,
          name: customer.name || 'Без имени',
          phone_number: customer.phoneNumber,
          is_active: customer.isActive,
          language: customer.language,
          created_at: customer.createdAt,
          total_orders: customer._count.orders,
          total_spent: customer.orders.reduce((sum, order) => sum + order.totalAmount, 0),
          addresses: customer.addresses.map((addr) => ({
            id: addr.id,
            title: addr.title,
            full_address: addr.fullAddress,
            is_default: addr.isDefault,
          })),
          orders: customer.orders.map((order) => ({
            id: order.id,
            order_number: order.orderNumber,
            status: order.status,
            total_amount: order.totalAmount,
            created_at: order.createdAt,
            items_count: order.items.length,
          })),
        },
      })
    } catch (error) {
      console.error('Admin get customer error:', error)
      return res.status(500).json({
        success: false,
        message: t('internalServerError'),
      })
    }
  }

  // PUT - Update customer
  if (req.method === 'PUT') {
    try {
      const body = updateCustomerSchema.parse(req.body)

      const existingCustomer = await prisma.user.findUnique({
        where: { id: customerId },
      })

      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          message: 'Клиент не найден',
        })
      }

      const updateData: any = {}
      if (body.name !== undefined) updateData.name = body.name
      if (body.is_active !== undefined) updateData.isActive = body.is_active

      const customer = await prisma.user.update({
        where: { id: customerId },
        data: updateData,
      })

      return res.status(200).json({
        success: true,
        data: {
          id: customer.id,
          name: customer.name,
          phone_number: customer.phoneNumber,
          is_active: customer.isActive,
        },
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: t('validationError'),
          errors: error.errors,
        })
      }

      console.error('Admin update customer error:', error)
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

export default requireAdminAuth(handler)
