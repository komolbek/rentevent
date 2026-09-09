import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useCartStore } from '@/stores/cartStore'
import type { Product, CartItem } from '@/types'

// Mock the utils module
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>()
  return {
    ...actual,
    calculateRentalDays: (start: Date, end: Date) => {
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return Math.max(1, diffDays + 1)
    },
    calculatePrice: (
      dailyPrice: number,
      rentalDays: number,
      quantity: number,
      _pricingTiers: any[],
      _quantityPricing: any[]
    ) => {
      const totalPrice = dailyPrice * rentalDays * quantity
      return {
        totalPrice,
        dailyPriceUsed: dailyPrice,
        savings: 0,
      }
    },
  }
})

function createTestProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    name: 'Test Product',
    categoryId: 'cat-1',
    photos: ['photo.jpg'],
    specifications: {},
    dailyPrice: 50000,
    pricingTiers: [],
    quantityPricing: [],
    totalStock: 10,
    isActive: true,
    createdAt: '2025-01-01',
    ...overrides,
  }
}

describe('cartStore', () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [],
      deliveryFee: 0,
      subtotal: 0,
      totalSavings: 0,
      total: 0,
      itemCount: 0,
    })
  })

  describe('addItem', () => {
    it('should add a new item to the cart', () => {
      const product = createTestProduct({ id: 'p1', dailyPrice: 50000 })
      const start = new Date('2025-02-01')
      const end = new Date('2025-02-03')

      useCartStore.getState().addItem(product, 2, start, end)

      const state = useCartStore.getState()
      expect(state.items).toHaveLength(1)
      expect(state.items[0].productId).toBe('p1')
      expect(state.items[0].quantity).toBe(2)
      expect(state.itemCount).toBe(2)
      expect(state.subtotal).toBeGreaterThan(0)
    })

    it('should update existing item if same product is added', () => {
      const product = createTestProduct({ id: 'p1' })
      const start = new Date('2025-02-01')
      const end = new Date('2025-02-03')

      useCartStore.getState().addItem(product, 1, start, end)
      useCartStore.getState().addItem(product, 3, start, end)

      const state = useCartStore.getState()
      expect(state.items).toHaveLength(1)
      expect(state.items[0].quantity).toBe(3)
    })

    it('should allow multiple different products', () => {
      const product1 = createTestProduct({ id: 'p1', name: 'Chair' })
      const product2 = createTestProduct({ id: 'p2', name: 'Table' })
      const start = new Date('2025-02-01')
      const end = new Date('2025-02-03')

      useCartStore.getState().addItem(product1, 1, start, end)
      useCartStore.getState().addItem(product2, 2, start, end)

      const state = useCartStore.getState()
      expect(state.items).toHaveLength(2)
      expect(state.itemCount).toBe(3)
    })

    it('should calculate subtotal correctly', () => {
      const product = createTestProduct({ id: 'p1', dailyPrice: 10000 })
      const start = new Date('2025-02-01')
      const end = new Date('2025-02-01') // 1 day

      useCartStore.getState().addItem(product, 2, start, end)

      const state = useCartStore.getState()
      // 10000 * 1 day * 2 quantity = 20000
      expect(state.subtotal).toBe(20000)
      expect(state.total).toBe(20000)
    })
  })

  describe('updateItem', () => {
    it('should update quantity of an existing item', () => {
      const product = createTestProduct({ id: 'p1' })
      const start = new Date('2025-02-01')
      const end = new Date('2025-02-03')

      useCartStore.getState().addItem(product, 1, start, end)
      useCartStore.getState().updateItem('p1', { quantity: 5 })

      const state = useCartStore.getState()
      expect(state.items[0].quantity).toBe(5)
      expect(state.itemCount).toBe(5)
    })

    it('should update rental dates of an existing item', () => {
      const product = createTestProduct({ id: 'p1' })
      const start = new Date('2025-02-01')
      const end = new Date('2025-02-03')

      useCartStore.getState().addItem(product, 1, start, end)

      const newStart = '2025-03-01'
      const newEnd = '2025-03-05'
      useCartStore.getState().updateItem('p1', {
        rentalStartDate: newStart,
        rentalEndDate: newEnd,
      })

      const state = useCartStore.getState()
      expect(state.items[0].rentalStartDate).toBe(new Date(newStart).toISOString())
      expect(state.items[0].rentalEndDate).toBe(new Date(newEnd).toISOString())
    })

    it('should do nothing for non-existent product', () => {
      const product = createTestProduct({ id: 'p1' })
      const start = new Date('2025-02-01')
      const end = new Date('2025-02-03')

      useCartStore.getState().addItem(product, 1, start, end)
      useCartStore.getState().updateItem('non-existent', { quantity: 10 })

      const state = useCartStore.getState()
      expect(state.items).toHaveLength(1)
      expect(state.items[0].quantity).toBe(1)
    })

    it('should recalculate totals after update', () => {
      const product = createTestProduct({ id: 'p1', dailyPrice: 10000 })
      const start = new Date('2025-02-01')
      const end = new Date('2025-02-01')

      useCartStore.getState().addItem(product, 1, start, end)
      const initialTotal = useCartStore.getState().subtotal

      useCartStore.getState().updateItem('p1', { quantity: 3 })
      const updatedTotal = useCartStore.getState().subtotal

      expect(updatedTotal).toBe(initialTotal * 3)
    })
  })

  describe('removeItem', () => {
    it('should remove an item from the cart', () => {
      const product = createTestProduct({ id: 'p1' })
      const start = new Date('2025-02-01')
      const end = new Date('2025-02-03')

      useCartStore.getState().addItem(product, 1, start, end)
      expect(useCartStore.getState().items).toHaveLength(1)

      useCartStore.getState().removeItem('p1')

      const state = useCartStore.getState()
      expect(state.items).toHaveLength(0)
      expect(state.subtotal).toBe(0)
      expect(state.total).toBe(0)
      expect(state.itemCount).toBe(0)
    })

    it('should not affect other items when removing one', () => {
      const product1 = createTestProduct({ id: 'p1' })
      const product2 = createTestProduct({ id: 'p2' })
      const start = new Date('2025-02-01')
      const end = new Date('2025-02-03')

      useCartStore.getState().addItem(product1, 1, start, end)
      useCartStore.getState().addItem(product2, 2, start, end)

      useCartStore.getState().removeItem('p1')

      const state = useCartStore.getState()
      expect(state.items).toHaveLength(1)
      expect(state.items[0].productId).toBe('p2')
      expect(state.itemCount).toBe(2)
    })

    it('should handle removing non-existent item gracefully', () => {
      const product = createTestProduct({ id: 'p1' })
      const start = new Date('2025-02-01')
      const end = new Date('2025-02-03')

      useCartStore.getState().addItem(product, 1, start, end)

      useCartStore.getState().removeItem('non-existent')

      expect(useCartStore.getState().items).toHaveLength(1)
    })
  })

  describe('clearCart', () => {
    it('should remove all items and reset totals', () => {
      const product1 = createTestProduct({ id: 'p1' })
      const product2 = createTestProduct({ id: 'p2' })
      const start = new Date('2025-02-01')
      const end = new Date('2025-02-03')

      useCartStore.getState().addItem(product1, 2, start, end)
      useCartStore.getState().addItem(product2, 3, start, end)
      useCartStore.getState().setDeliveryFee(25000)

      useCartStore.getState().clearCart()

      const state = useCartStore.getState()
      expect(state.items).toEqual([])
      expect(state.subtotal).toBe(0)
      expect(state.totalSavings).toBe(0)
      expect(state.total).toBe(0)
      expect(state.itemCount).toBe(0)
      expect(state.deliveryFee).toBe(0)
    })
  })

  describe('setDeliveryFee', () => {
    it('should set delivery fee and update total', () => {
      const product = createTestProduct({ id: 'p1', dailyPrice: 10000 })
      const start = new Date('2025-02-01')
      const end = new Date('2025-02-01')

      useCartStore.getState().addItem(product, 1, start, end)
      const subtotal = useCartStore.getState().subtotal

      useCartStore.getState().setDeliveryFee(15000)

      const state = useCartStore.getState()
      expect(state.deliveryFee).toBe(15000)
      expect(state.total).toBe(subtotal + 15000)
    })

    it('should work with zero delivery fee', () => {
      useCartStore.getState().setDeliveryFee(0)

      expect(useCartStore.getState().deliveryFee).toBe(0)
    })
  })

  describe('recalculateTotals', () => {
    it('should recalculate all totals from current items', () => {
      const product = createTestProduct({ id: 'p1', dailyPrice: 20000 })
      const start = new Date('2025-02-01')
      const end = new Date('2025-02-01')

      useCartStore.getState().addItem(product, 2, start, end)
      useCartStore.getState().setDeliveryFee(5000)

      // Manually corrupt the totals
      useCartStore.setState({ subtotal: 0, total: 0, itemCount: 0 })

      useCartStore.getState().recalculateTotals()

      const state = useCartStore.getState()
      expect(state.subtotal).toBe(40000) // 20000 * 1 day * 2 qty
      expect(state.total).toBe(45000) // 40000 + 5000 delivery
      expect(state.itemCount).toBe(2)
    })
  })
})
