import { vi } from 'vitest'
import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Creates a mock NextApiRequest object.
 */
export function createMockRequest(overrides: {
  method?: string
  body?: any
  query?: Record<string, string | string[]>
  headers?: Record<string, string>
  url?: string
  cookies?: Record<string, string>
} = {}): NextApiRequest {
  return {
    method: overrides.method || 'GET',
    body: overrides.body || {},
    query: overrides.query || {},
    headers: overrides.headers || {},
    url: overrides.url || '/api/test',
    cookies: overrides.cookies || {},
    socket: { remoteAddress: '127.0.0.1' } as any,
  } as unknown as NextApiRequest
}

/**
 * Creates a mock NextApiResponse object with spy methods.
 * The response captures status codes and JSON payloads.
 */
export function createMockResponse(): NextApiResponse & {
  _statusCode: number
  _json: any
  _headers: Record<string, string>
} {
  const res: any = {
    _statusCode: 200,
    _json: null,
    _headers: {},
  }

  res.status = vi.fn((code: number) => {
    res._statusCode = code
    return res
  })

  res.json = vi.fn((data: any) => {
    res._json = data
    return res
  })

  res.setHeader = vi.fn((name: string, value: string) => {
    res._headers[name] = value
    return res
  })

  res.end = vi.fn(() => res)

  return res as NextApiResponse & {
    _statusCode: number
    _json: any
    _headers: Record<string, string>
  }
}

/**
 * Generates a mock session token for authenticated requests.
 */
export function createMockAuthHeaders(token = 'test-session-token-abc123'): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    'accept-language': 'en',
  }
}

/**
 * Creates a mock product for testing.
 */
export function createMockProduct(overrides: Partial<{
  id: string
  name: string
  categoryId: string
  photos: string[]
  dailyPrice: number
  totalStock: number
  minRentalDays: number
  maxRentalDays: number
  depositAmount: number
  isActive: boolean
  createdAt: Date
  specWidth: number | null
  specHeight: number | null
  specDepth: number | null
  specWeight: number | null
  specColor: string | null
  specMaterial: string | null
  pricingTiers: any[]
  quantityPricing: any[]
}> = {}) {
  return {
    id: 'product-1',
    name: 'Test Product',
    categoryId: 'cat-1',
    photos: ['photo1.jpg'],
    dailyPrice: 50000,
    totalStock: 10,
    minRentalDays: 1,
    maxRentalDays: 30,
    depositAmount: 100000,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    specWidth: null,
    specHeight: null,
    specDepth: null,
    specWeight: null,
    specColor: null,
    specMaterial: null,
    pricingTiers: [],
    quantityPricing: [],
    ...overrides,
  }
}

/**
 * Creates a mock user for testing.
 */
export function createMockUser(overrides: Partial<{
  id: string
  phoneNumber: string
  name: string | null
  isActive: boolean
  createdAt: Date
}> = {}) {
  return {
    id: 'user-1',
    phoneNumber: '+998901234567',
    name: 'Test User',
    isActive: true,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  }
}

/**
 * Creates a mock order for testing.
 */
export function createMockOrder(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'order-1',
    orderNumber: '202501010001',
    userId: 'user-1',
    status: 'CONFIRMED',
    deliveryType: 'SELF_PICKUP',
    deliveryAddressId: null,
    deliveryAddress: null,
    deliveryFee: 0,
    subtotal: 100000,
    totalAmount: 100000,
    totalSavings: 0,
    rentalStartDate: new Date('2025-02-01'),
    rentalEndDate: new Date('2025-02-03'),
    paymentMethod: 'PAYME',
    paymentStatus: 'PENDING',
    notes: null,
    items: [
      {
        id: 'item-1',
        productId: 'product-1',
        productName: 'Test Product',
        productPhoto: 'photo1.jpg',
        quantity: 1,
        dailyPrice: 50000,
        totalPrice: 100000,
        savings: 0,
      },
    ],
    statusHistory: [
      {
        id: 'hist-1',
        status: 'CONFIRMED',
        notes: 'Order created',
        createdAt: new Date('2025-01-15'),
      },
    ],
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-15'),
    ...overrides,
  }
}
