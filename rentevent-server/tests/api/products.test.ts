import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPrismaMock, type PrismaMock } from '../helpers/prisma-mock'
import {
  createMockRequest,
  createMockResponse,
  createMockProduct,
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

import productsHandler from '@/pages/api/products/index'
import productByIdHandler from '@/pages/api/products/[id]/index'

describe('GET /api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return paginated products with default parameters', async () => {
    const mockProducts = [
      createMockProduct({ id: 'p1', name: 'Product 1' }),
      createMockProduct({ id: 'p2', name: 'Product 2' }),
    ]

    prismaMock.product.findMany.mockResolvedValue(mockProducts)
    prismaMock.product.count.mockResolvedValue(2)

    const req = createMockRequest({
      method: 'GET',
      query: {},
    })
    const res = createMockResponse()

    await productsHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res._json.success).toBe(true)
    expect(res._json.data).toHaveLength(2)
    expect(res._json.pagination).toMatchObject({
      current_page: 1,
      limit: 20,
      total_count: 2,
      total_pages: 1,
      has_more: false,
    })
  })

  it('should handle pagination parameters correctly', async () => {
    prismaMock.product.findMany.mockResolvedValue([])
    prismaMock.product.count.mockResolvedValue(50)

    const req = createMockRequest({
      method: 'GET',
      query: { page: '2', limit: '10' },
    })
    const res = createMockResponse()

    await productsHandler(req, res)

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      })
    )
    expect(res._json.pagination).toMatchObject({
      current_page: 2,
      total_count: 50,
      total_pages: 5,
      has_more: true,
    })
  })

  it('should filter by category_id', async () => {
    prismaMock.product.findMany.mockResolvedValue([])
    prismaMock.product.count.mockResolvedValue(0)

    const req = createMockRequest({
      method: 'GET',
      query: { category_id: 'cat-furniture' },
    })
    const res = createMockResponse()

    await productsHandler(req, res)

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          categoryId: 'cat-furniture',
        }),
      })
    )
  })

  it('should filter by search term', async () => {
    prismaMock.product.findMany.mockResolvedValue([])
    prismaMock.product.count.mockResolvedValue(0)

    const req = createMockRequest({
      method: 'GET',
      query: { search: 'chair' },
    })
    const res = createMockResponse()

    await productsHandler(req, res)

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          name: { contains: 'chair', mode: 'insensitive' },
        }),
      })
    )
  })

  it('should sort by price ascending', async () => {
    prismaMock.product.findMany.mockResolvedValue([])
    prismaMock.product.count.mockResolvedValue(0)

    const req = createMockRequest({
      method: 'GET',
      query: { sort: 'price_asc' },
    })
    const res = createMockResponse()

    await productsHandler(req, res)

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { dailyPrice: 'asc' },
      })
    )
  })

  it('should sort by price descending', async () => {
    prismaMock.product.findMany.mockResolvedValue([])
    prismaMock.product.count.mockResolvedValue(0)

    const req = createMockRequest({
      method: 'GET',
      query: { sort: 'price_desc' },
    })
    const res = createMockResponse()

    await productsHandler(req, res)

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { dailyPrice: 'desc' },
      })
    )
  })

  it('should sort by newest by default', async () => {
    prismaMock.product.findMany.mockResolvedValue([])
    prismaMock.product.count.mockResolvedValue(0)

    const req = createMockRequest({
      method: 'GET',
      query: {},
    })
    const res = createMockResponse()

    await productsHandler(req, res)

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      })
    )
  })

  it('should sort by popularity using order count', async () => {
    const mockProductsWithCount = [
      { ...createMockProduct({ id: 'p1' }), _count: { orderItems: 10 } },
      { ...createMockProduct({ id: 'p2' }), _count: { orderItems: 5 } },
      { ...createMockProduct({ id: 'p3' }), _count: { orderItems: 20 } },
    ]

    prismaMock.product.findMany.mockResolvedValue(mockProductsWithCount)

    const req = createMockRequest({
      method: 'GET',
      query: { sort: 'popular' },
    })
    const res = createMockResponse()

    await productsHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    // Products should be sorted by order count descending
    expect(res._json.data[0].id).toBe('p3')
    expect(res._json.data[1].id).toBe('p1')
    expect(res._json.data[2].id).toBe('p2')
  })

  it('should cap limit at 50', async () => {
    prismaMock.product.findMany.mockResolvedValue([])
    prismaMock.product.count.mockResolvedValue(0)

    const req = createMockRequest({
      method: 'GET',
      query: { limit: '100' },
    })
    const res = createMockResponse()

    await productsHandler(req, res)

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
      })
    )
  })

  it('should format product response correctly', async () => {
    const mockProduct = createMockProduct({
      id: 'p1',
      name: 'Test Chair',
      specColor: 'Blue',
      specMaterial: 'Wood',
      pricingTiers: [{ days: 3, totalPrice: 120000 }],
      quantityPricing: [{ quantity: 5, totalPrice: 200000 }],
    })

    prismaMock.product.findMany.mockResolvedValue([mockProduct])
    prismaMock.product.count.mockResolvedValue(1)

    const req = createMockRequest({
      method: 'GET',
    })
    const res = createMockResponse()

    await productsHandler(req, res)

    const product = res._json.data[0]
    expect(product).toMatchObject({
      id: 'p1',
      name: 'Test Chair',
      specifications: {
        color: 'Blue',
        material: 'Wood',
      },
      daily_price: 50000,
      pricing_tiers: [{ days: 3, total_price: 120000 }],
      quantity_pricing: [{ quantity: 5, total_price: 200000 }],
    })
  })

  it('should reject non-GET methods', async () => {
    const req = createMockRequest({
      method: 'POST',
    })
    const res = createMockResponse()

    await productsHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
  })
})

describe('GET /api/products/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return a product by ID', async () => {
    const mockProduct = {
      ...createMockProduct({ id: 'p1', name: 'Fancy Table' }),
      category: { id: 'cat-1', name: 'Furniture' },
      pricingTiers: [],
      quantityPricing: [],
    }

    prismaMock.product.findUnique.mockResolvedValue(mockProduct)

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'p1' },
    })
    const res = createMockResponse()

    await productByIdHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res._json.success).toBe(true)
    expect(res._json.data).toMatchObject({
      id: 'p1',
      name: 'Fancy Table',
    })
  })

  it('should return 404 for non-existent product', async () => {
    prismaMock.product.findUnique.mockResolvedValue(null)

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'non-existent' },
    })
    const res = createMockResponse()

    await productByIdHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res._json.success).toBe(false)
  })

  it('should return 404 for inactive product', async () => {
    const inactiveProduct = createMockProduct({ isActive: false })
    prismaMock.product.findUnique.mockResolvedValue(inactiveProduct)

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'inactive-1' },
    })
    const res = createMockResponse()

    await productByIdHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res._json.success).toBe(false)
  })
})
