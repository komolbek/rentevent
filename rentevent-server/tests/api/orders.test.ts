import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPrismaMock, type PrismaMock } from '../helpers/prisma-mock'
import {
  createMockRequest,
  createMockResponse,
  createMockProduct,
  createMockOrder,
  createMockUser,
  createMockAuthHeaders,
} from '../helpers/api-test-utils'

let prismaMock: PrismaMock

vi.mock('@/lib/db', () => {
  const mock = createPrismaMock()
  prismaMock = mock
  return { default: mock, prisma: mock }
})

vi.mock('@/lib/logger', () => ({
  logRequest: vi.fn(),
  logResponse: vi.fn(),
}))

// Mock the auth middleware to bypass authentication in tests
vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: Function) => {
    return async (req: any, res: any) => {
      // Simulate auth middleware: extract userId from a test header or default
      const userId = req.headers['x-test-user-id'] || 'user-1'
      return handler(req, res, userId)
    }
  },
  authMiddleware: vi.fn().mockResolvedValue({
    authenticated: true,
    userId: 'user-1',
  }),
}))

import createOrderHandler from '@/pages/api/orders/index'
import myOrdersHandler from '@/pages/api/orders/my-orders'
import orderByIdHandler from '@/pages/api/orders/[id]'

describe('POST /api/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a valid order with self-pickup', async () => {
    const futureStart = new Date()
    futureStart.setDate(futureStart.getDate() + 1)
    const futureEnd = new Date()
    futureEnd.setDate(futureEnd.getDate() + 3)

    const mockProduct = createMockProduct({
      id: 'prod-1',
      totalStock: 10,
      minRentalDays: 1,
      maxRentalDays: 30,
      pricingTiers: [],
      quantityPricing: [],
    })

    const mockOrder = createMockOrder({
      id: 'order-new',
      orderNumber: '202503150001',
    })

    // Mock transaction
    prismaMock.$transaction.mockImplementation(async (fn: Function) => {
      const txClient = {
        $queryRawUnsafe: vi.fn(),
        product: {
          findMany: vi.fn().mockResolvedValue([mockProduct]),
        },
        order: {
          findMany: vi.fn().mockResolvedValue([]), // No overlapping orders
          create: vi.fn().mockResolvedValue(mockOrder),
        },
        orderCounter: {
          upsert: vi.fn().mockResolvedValue({ id: '20250315', counter: 1 }),
        },
      }
      return fn(txClient)
    })

    const req = createMockRequest({
      method: 'POST',
      body: {
        items: [{ product_id: 'prod-1', quantity: 2 }],
        delivery_type: 'SELF_PICKUP',
        rental_start_date: futureStart.toISOString(),
        rental_end_date: futureEnd.toISOString(),
        payment_method: 'PAYME',
      },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await createOrderHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res._json.success).toBe(true)
    expect(res._json.data).toBeDefined()
  })

  it('should return 400 for empty items array', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: {
        items: [],
        delivery_type: 'SELF_PICKUP',
        rental_start_date: '2025-02-01',
        rental_end_date: '2025-02-03',
        payment_method: 'PAYME',
      },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await createOrderHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json.success).toBe(false)
  })

  it('should return 400 for invalid delivery_type', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: {
        items: [{ product_id: 'p1', quantity: 1 }],
        delivery_type: 'DRONE',
        rental_start_date: '2025-02-01',
        rental_end_date: '2025-02-03',
        payment_method: 'PAYME',
      },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await createOrderHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('should return 400 for invalid payment_method', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: {
        items: [{ product_id: 'p1', quantity: 1 }],
        delivery_type: 'SELF_PICKUP',
        rental_start_date: '2025-02-01',
        rental_end_date: '2025-02-03',
        payment_method: 'BITCOIN',
      },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await createOrderHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('should return 400 when start date equals end date', async () => {
    const sameDate = new Date()
    sameDate.setDate(sameDate.getDate() + 1)

    const req = createMockRequest({
      method: 'POST',
      body: {
        items: [{ product_id: 'p1', quantity: 1 }],
        delivery_type: 'SELF_PICKUP',
        rental_start_date: sameDate.toISOString(),
        rental_end_date: sameDate.toISOString(),
        payment_method: 'PAYME',
      },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await createOrderHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('should return 400 when start date is in the past', async () => {
    const pastDate = new Date('2020-01-01')
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 5)

    const req = createMockRequest({
      method: 'POST',
      body: {
        items: [{ product_id: 'p1', quantity: 1 }],
        delivery_type: 'SELF_PICKUP',
        rental_start_date: pastDate.toISOString(),
        rental_end_date: futureDate.toISOString(),
        payment_method: 'PAYME',
      },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await createOrderHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('should return 400 for insufficient stock', async () => {
    const futureStart = new Date()
    futureStart.setDate(futureStart.getDate() + 1)
    const futureEnd = new Date()
    futureEnd.setDate(futureEnd.getDate() + 3)

    const mockProduct = createMockProduct({
      id: 'prod-1',
      totalStock: 2,
    })

    const { ApiError } = await import('@/lib/api/error-handler')

    prismaMock.$transaction.mockImplementation(async (fn: Function) => {
      const txClient = {
        $queryRawUnsafe: vi.fn(),
        product: {
          findMany: vi.fn().mockResolvedValue([mockProduct]),
        },
        order: {
          findMany: vi.fn().mockResolvedValue([
            // Existing order that reserves 2 items
            {
              items: [{ productId: 'prod-1', quantity: 2 }],
            },
          ]),
        },
        orderCounter: {
          upsert: vi.fn().mockResolvedValue({ id: '20250315', counter: 1 }),
        },
      }
      return fn(txClient)
    })

    const req = createMockRequest({
      method: 'POST',
      body: {
        items: [{ product_id: 'prod-1', quantity: 1 }],
        delivery_type: 'SELF_PICKUP',
        rental_start_date: futureStart.toISOString(),
        rental_end_date: futureEnd.toISOString(),
        payment_method: 'CLICK',
      },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await createOrderHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json.success).toBe(false)
  })

  it('should reject non-POST methods', async () => {
    const req = createMockRequest({
      method: 'GET',
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await createOrderHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
  })
})

describe('GET /api/orders/my-orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return user orders with pagination', async () => {
    const mockOrders = [
      createMockOrder({ id: 'order-1', orderNumber: '202501010001' }),
      createMockOrder({ id: 'order-2', orderNumber: '202501020001' }),
    ]

    prismaMock.order.findMany.mockResolvedValue(mockOrders)
    prismaMock.order.count.mockResolvedValue(2)

    const req = createMockRequest({
      method: 'GET',
      query: { page: '1', limit: '10' },
      headers: { ...createMockAuthHeaders(), 'x-test-user-id': 'user-1' },
    })
    const res = createMockResponse()

    await myOrdersHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res._json.success).toBe(true)
    expect(res._json.data).toHaveLength(2)
    expect(res._json.pagination).toMatchObject({
      current_page: 1,
      total_count: 2,
    })
  })

  it('should filter by status', async () => {
    prismaMock.order.findMany.mockResolvedValue([])
    prismaMock.order.count.mockResolvedValue(0)

    const req = createMockRequest({
      method: 'GET',
      query: { status: 'CONFIRMED' },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await myOrdersHandler(req, res)

    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          status: 'CONFIRMED',
        }),
      })
    )
  })

  it('should return empty array when no orders exist', async () => {
    prismaMock.order.findMany.mockResolvedValue([])
    prismaMock.order.count.mockResolvedValue(0)

    const req = createMockRequest({
      method: 'GET',
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await myOrdersHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res._json.data).toEqual([])
    expect(res._json.pagination.total_count).toBe(0)
  })
})

describe('GET /api/orders/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a specific order by ID', async () => {
    const mockOrder = createMockOrder({ id: 'order-123' })
    prismaMock.order.findFirst.mockResolvedValue(mockOrder)

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'order-123' },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await orderByIdHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res._json.success).toBe(true)
    expect(res._json.data.id).toBe('order-123')
  })

  it('should return 404 for non-existent order', async () => {
    prismaMock.order.findFirst.mockResolvedValue(null)

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'non-existent' },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await orderByIdHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res._json.success).toBe(false)
  })

  it('should only return orders belonging to the authenticated user', async () => {
    prismaMock.order.findFirst.mockResolvedValue(null)

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'order-other-user' },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await orderByIdHandler(req, res)

    expect(prismaMock.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'order-other-user',
          userId: 'user-1',
        }),
      })
    )
  })

  it('should return 400 for missing order ID', async () => {
    const req = createMockRequest({
      method: 'GET',
      query: {},
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await orderByIdHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('should include status history in the response', async () => {
    const mockOrder = createMockOrder({
      statusHistory: [
        { id: 'h1', status: 'CONFIRMED', notes: 'Order created', createdAt: new Date() },
        { id: 'h2', status: 'PREPARING', notes: 'Being prepared', createdAt: new Date() },
      ],
    })
    prismaMock.order.findFirst.mockResolvedValue(mockOrder)

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'order-1' },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await orderByIdHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res._json.data.status_history).toHaveLength(2)
  })
})
