import { vi } from 'vitest'

// Deep mock factory for Prisma models
function createModelMock() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  }
}

export function createPrismaMock() {
  return {
    user: createModelMock(),
    session: createModelMock(),
    oTP: createModelMock(),
    product: createModelMock(),
    order: createModelMock(),
    orderItem: createModelMock(),
    orderCounter: createModelMock(),
    review: createModelMock(),
    category: createModelMock(),
    address: createModelMock(),
    card: createModelMock(),
    favorite: createModelMock(),
    staff: createModelMock(),
    deliveryZone: createModelMock(),
    $transaction: vi.fn(),
    $queryRawUnsafe: vi.fn(),
  }
}

export type PrismaMock = ReturnType<typeof createPrismaMock>

/**
 * Sets up the Prisma mock for a test module.
 * Call this at the top of your test file before importing the module under test.
 *
 * Usage:
 *   const prisma = setupPrismaMock()
 *   // then import your module
 */
export function setupPrismaMock(): PrismaMock {
  const mock = createPrismaMock()

  vi.mock('@/lib/db', () => ({
    default: mock,
    prisma: mock,
  }))

  return mock
}
