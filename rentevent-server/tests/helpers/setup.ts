import { vi } from 'vitest'

// Suppress console output during tests
vi.spyOn(console, 'error').mockImplementation(() => {})
vi.spyOn(console, 'log').mockImplementation(() => {})

// Set default environment variables for tests
process.env.ADMIN_SESSION_SECRET = 'test-secret-key-for-unit-tests'
process.env.ADMIN_API_KEY = 'test-api-key'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
