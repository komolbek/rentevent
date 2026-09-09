import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/db'
import { requireAdminAuth } from '@/lib/auth/admin-middleware'
import { createTranslator } from '@/lib/i18n'
import { startOfDay, endOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const t = createTranslator(req)

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: t('methodNotAllowed'),
    })
  }

  try {
    const today = new Date()
    const todayStart = startOfDay(today)
    const todayEnd = endOfDay(today)
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const monthStart = startOfMonth(today)

    // Today's stats
    const [
      todayOrders,
      todayRevenue,
      pendingOrders,
      returnsDueToday,
      weekRevenue,
      monthRevenue,
      totalProducts,
      totalCategories,
      totalCustomers,
    ] = await Promise.all([
      prisma.order.count({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: todayStart, lte: todayEnd },
          status: { not: 'CANCELLED' },
        },
        _sum: { totalAmount: true },
      }),
      prisma.order.count({
        where: { status: 'CONFIRMED' },
      }),
      prisma.order.count({
        where: {
          status: 'DELIVERED',
          rentalEndDate: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: weekStart },
          status: { not: 'CANCELLED' },
        },
        _sum: { totalAmount: true },
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: monthStart },
          status: { not: 'CANCELLED' },
        },
        _sum: { totalAmount: true },
      }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.category.count({ where: { isActive: true } }),
      prisma.user.count(),
    ])

    // Recent orders
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        items: true,
      },
    })

    // Orders by status
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
    })

    // Revenue by day (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i)
      return {
        date: startOfDay(date),
        label: date.toISOString().split('T')[0],
      }
    })

    const revenueByDay = await Promise.all(
      last7Days.map(async ({ date, label }) => {
        const dayEnd = endOfDay(date)
        const revenue = await prisma.order.aggregate({
          where: {
            createdAt: { gte: date, lte: dayEnd },
            status: { not: 'CANCELLED' },
          },
          _sum: { totalAmount: true },
        })
        return {
          date: label,
          revenue: revenue._sum.totalAmount || 0,
        }
      })
    )

    return res.status(200).json({
      success: true,
      data: {
        today: {
          orders: todayOrders,
          revenue: todayRevenue._sum.totalAmount || 0,
          pending_orders: pendingOrders,
          returns_due: returnsDueToday,
        },
        week: {
          revenue: weekRevenue._sum.totalAmount || 0,
        },
        month: {
          revenue: monthRevenue._sum.totalAmount || 0,
        },
        totals: {
          products: totalProducts,
          categories: totalCategories,
          customers: totalCustomers,
        },
        orders_by_status: ordersByStatus.map((item) => ({
          status: item.status,
          count: item._count,
        })),
        revenue_by_day: revenueByDay,
        recent_orders: recentOrders.map((order) => ({
          id: order.id,
          order_number: order.orderNumber,
          status: order.status,
          customer_name: order.user.name || order.user.phoneNumber,
          items_count: order.items.length,
          total_amount: order.totalAmount,
          created_at: order.createdAt,
        })),
      },
    })
  } catch (error) {
    console.error('Admin dashboard error:', error)
    return res.status(500).json({
      success: false,
      message: t('internalServerError'),
    })
  }
}

export default requireAdminAuth(handler)
