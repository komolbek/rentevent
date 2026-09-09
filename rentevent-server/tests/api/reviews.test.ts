import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPrismaMock, type PrismaMock } from '../helpers/prisma-mock'
import {
  createMockRequest,
  createMockResponse,
  createMockProduct,
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

vi.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: Function) => {
    return async (req: any, res: any) => {
      const userId = req.headers['x-test-user-id'] || 'user-1'
      return handler(req, res, userId)
    }
  },
}))

import productReviewsHandler from '@/pages/api/products/[id]/reviews'
import createReviewHandler from '@/pages/api/reviews/index'

describe('GET /api/products/[id]/reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return reviews for a product', async () => {
    const mockProduct = createMockProduct({ id: 'prod-1' })
    const mockReviews = [
      {
        id: 'rev-1',
        userId: 'user-1',
        user: { id: 'user-1', name: 'Alice' },
        productId: 'prod-1',
        orderId: 'order-1',
        rating: 5,
        comment: 'Great product!',
        photos: [],
        isVisible: true,
        createdAt: new Date('2025-01-10'),
        updatedAt: new Date('2025-01-10'),
      },
      {
        id: 'rev-2',
        userId: 'user-2',
        user: { id: 'user-2', name: 'Bob' },
        productId: 'prod-1',
        orderId: 'order-2',
        rating: 4,
        comment: 'Good quality',
        photos: ['photo.jpg'],
        isVisible: true,
        createdAt: new Date('2025-01-12'),
        updatedAt: new Date('2025-01-12'),
      },
    ]

    prismaMock.product.findUnique.mockResolvedValue(mockProduct)
    prismaMock.review.findMany.mockResolvedValue(mockReviews)
    prismaMock.review.count.mockResolvedValue(2)
    prismaMock.review.aggregate.mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: { rating: 2 },
    })

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'prod-1' },
    })
    const res = createMockResponse()

    await productReviewsHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res._json.success).toBe(true)
    expect(res._json.data.reviews).toHaveLength(2)
    expect(res._json.data.average_rating).toBe(4.5)
    expect(res._json.data.total_reviews).toBe(2)
  })

  it('should return 404 for non-existent product', async () => {
    prismaMock.product.findUnique.mockResolvedValue(null)

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'non-existent' },
    })
    const res = createMockResponse()

    await productReviewsHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res._json.success).toBe(false)
  })

  it('should handle pagination', async () => {
    const mockProduct = createMockProduct({ id: 'prod-1' })
    prismaMock.product.findUnique.mockResolvedValue(mockProduct)
    prismaMock.review.findMany.mockResolvedValue([])
    prismaMock.review.count.mockResolvedValue(25)
    prismaMock.review.aggregate.mockResolvedValue({
      _avg: { rating: 4.0 },
      _count: { rating: 25 },
    })

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'prod-1', page: '2', limit: '10' },
    })
    const res = createMockResponse()

    await productReviewsHandler(req, res)

    expect(prismaMock.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      })
    )
    expect(res._json.pagination).toMatchObject({
      current_page: 2,
      total_count: 25,
      total_pages: 3,
      has_more: true,
    })
  })

  it('should return empty reviews with zero average for product with no reviews', async () => {
    const mockProduct = createMockProduct({ id: 'prod-1' })
    prismaMock.product.findUnique.mockResolvedValue(mockProduct)
    prismaMock.review.findMany.mockResolvedValue([])
    prismaMock.review.count.mockResolvedValue(0)
    prismaMock.review.aggregate.mockResolvedValue({
      _avg: { rating: null },
      _count: { rating: 0 },
    })

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'prod-1' },
    })
    const res = createMockResponse()

    await productReviewsHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res._json.data.reviews).toEqual([])
    expect(res._json.data.average_rating).toBe(0)
    expect(res._json.data.total_reviews).toBe(0)
  })

  it('should format review response correctly', async () => {
    const mockProduct = createMockProduct({ id: 'prod-1' })
    const mockReview = {
      id: 'rev-1',
      userId: 'user-1',
      user: { id: 'user-1', name: 'Test User' },
      productId: 'prod-1',
      orderId: 'order-1',
      rating: 5,
      comment: 'Excellent!',
      photos: ['img1.jpg', 'img2.jpg'],
      isVisible: true,
      createdAt: new Date('2025-01-10'),
      updatedAt: new Date('2025-01-10'),
    }

    prismaMock.product.findUnique.mockResolvedValue(mockProduct)
    prismaMock.review.findMany.mockResolvedValue([mockReview])
    prismaMock.review.count.mockResolvedValue(1)
    prismaMock.review.aggregate.mockResolvedValue({
      _avg: { rating: 5.0 },
      _count: { rating: 1 },
    })

    const req = createMockRequest({
      method: 'GET',
      query: { id: 'prod-1' },
    })
    const res = createMockResponse()

    await productReviewsHandler(req, res)

    const review = res._json.data.reviews[0]
    expect(review).toMatchObject({
      id: 'rev-1',
      user_id: 'user-1',
      user_name: 'Test User',
      product_id: 'prod-1',
      order_id: 'order-1',
      rating: 5,
      comment: 'Excellent!',
      photos: ['img1.jpg', 'img2.jpg'],
    })
  })
})

describe('POST /api/reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a review for a completed order', async () => {
    const mockProduct = createMockProduct({ id: 'prod-1' })
    const mockCompletedOrder = { id: 'order-1', userId: 'user-1', status: 'DELIVERED' }
    const mockCreatedReview = {
      id: 'rev-new',
      userId: 'user-1',
      user: { id: 'user-1', name: 'Test User' },
      productId: 'prod-1',
      orderId: 'order-1',
      rating: 5,
      comment: 'Excellent product!',
      photos: [],
      isVisible: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    prismaMock.product.findUnique.mockResolvedValue(mockProduct)
    prismaMock.review.findUnique.mockResolvedValue(null) // No existing review
    prismaMock.order.findFirst.mockResolvedValue(mockCompletedOrder)
    prismaMock.review.create.mockResolvedValue(mockCreatedReview)

    const req = createMockRequest({
      method: 'POST',
      body: {
        product_id: 'prod-1',
        rating: 5,
        comment: 'Excellent product!',
      },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await createReviewHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res._json.success).toBe(true)
    expect(res._json.data).toMatchObject({
      id: 'rev-new',
      rating: 5,
      comment: 'Excellent product!',
    })
  })

  it('should return 404 for non-existent product', async () => {
    prismaMock.product.findUnique.mockResolvedValue(null)

    const req = createMockRequest({
      method: 'POST',
      body: {
        product_id: 'non-existent',
        rating: 5,
      },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await createReviewHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
  })

  it('should return 409 if user already reviewed this product', async () => {
    const mockProduct = createMockProduct({ id: 'prod-1' })
    prismaMock.product.findUnique.mockResolvedValue(mockProduct)
    prismaMock.review.findUnique.mockResolvedValue({
      id: 'existing-review',
      userId: 'user-1',
      productId: 'prod-1',
    })

    const req = createMockRequest({
      method: 'POST',
      body: {
        product_id: 'prod-1',
        rating: 4,
      },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await createReviewHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(409)
    expect(res._json.success).toBe(false)
  })

  it('should return 403 if user has no completed order for the product', async () => {
    const mockProduct = createMockProduct({ id: 'prod-1' })
    prismaMock.product.findUnique.mockResolvedValue(mockProduct)
    prismaMock.review.findUnique.mockResolvedValue(null)
    prismaMock.order.findFirst.mockResolvedValue(null) // No completed order

    const req = createMockRequest({
      method: 'POST',
      body: {
        product_id: 'prod-1',
        rating: 5,
      },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await createReviewHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res._json.success).toBe(false)
  })

  it('should return 400 for invalid rating (out of range)', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: {
        product_id: 'prod-1',
        rating: 6,
      },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await createReviewHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('should return 400 for rating of 0', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: {
        product_id: 'prod-1',
        rating: 0,
      },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await createReviewHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('should return 400 for missing product_id', async () => {
    const req = createMockRequest({
      method: 'POST',
      body: {
        rating: 5,
      },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await createReviewHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('should accept review with photos', async () => {
    const mockProduct = createMockProduct({ id: 'prod-1' })
    const mockCompletedOrder = { id: 'order-1', userId: 'user-1', status: 'RETURNED' }
    const mockCreatedReview = {
      id: 'rev-with-photos',
      userId: 'user-1',
      user: { id: 'user-1', name: 'Test' },
      productId: 'prod-1',
      orderId: 'order-1',
      rating: 4,
      comment: null,
      photos: ['img1.jpg', 'img2.jpg'],
      isVisible: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    prismaMock.product.findUnique.mockResolvedValue(mockProduct)
    prismaMock.review.findUnique.mockResolvedValue(null)
    prismaMock.order.findFirst.mockResolvedValue(mockCompletedOrder)
    prismaMock.review.create.mockResolvedValue(mockCreatedReview)

    const req = createMockRequest({
      method: 'POST',
      body: {
        product_id: 'prod-1',
        rating: 4,
        photos: ['img1.jpg', 'img2.jpg'],
      },
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await createReviewHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(prismaMock.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          photos: ['img1.jpg', 'img2.jpg'],
        }),
      })
    )
  })

  it('should reject non-POST methods', async () => {
    const req = createMockRequest({
      method: 'GET',
      headers: createMockAuthHeaders(),
    })
    const res = createMockResponse()

    await createReviewHandler(req, res)

    expect(res.status).toHaveBeenCalledWith(405)
  })
})
