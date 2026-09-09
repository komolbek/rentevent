// In-memory sliding-window rate limiter.
// Sufficient for single-instance deployments. For multi-instance,
// replace with a Redis-backed implementation.

interface RateLimitEntry {
  timestamps: number[]
}

const stores = new Map<string, Map<string, RateLimitEntry>>()

function getStore(namespace: string): Map<string, RateLimitEntry> {
  let store = stores.get(namespace)
  if (!store) {
    store = new Map()
    stores.set(namespace, store)
  }
  return store
}

interface RateLimitConfig {
  /** Unique namespace to separate different limiters */
  namespace: string
  /** Maximum requests allowed in the window */
  maxRequests: number
  /** Window size in milliseconds */
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

export function checkRateLimit(
  config: RateLimitConfig,
  key: string
): RateLimitResult {
  const store = getStore(config.namespace)
  const now = Date.now()
  const windowStart = now - config.windowMs

  let entry = store.get(key)
  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart)

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0]
    const retryAfterMs = oldestInWindow + config.windowMs - now
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, retryAfterMs),
    }
  }

  entry.timestamps.push(now)
  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    retryAfterMs: 0,
  }
}

// Periodic cleanup of stale entries (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [, store] of stores) {
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => t > now - 15 * 60 * 1000)
      if (entry.timestamps.length === 0) {
        store.delete(key)
      }
    }
  }
}, 5 * 60 * 1000).unref()
