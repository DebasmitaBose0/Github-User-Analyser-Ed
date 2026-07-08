import type { NextApiRequest } from 'next'

interface RateWindow {
  count: number
  resetAt: number
  path?: string
}

export function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim()
  }
  return req.socket.remoteAddress || 'unknown'
}

export interface RateLimiter {
  check(ip: string, path?: string): number | null
  getRemaining(ip: string): number
}

export function createRateLimiter(windowMs: number, max: number, maxKeys = 5000): RateLimiter {
  const buckets = new Map<string, RateWindow>()

  function cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of buckets) {
      if (now >= entry.resetAt) buckets.delete(key)
    }
  }

  return {
    check(ip: string, path?: string): number | null {
      const now = Date.now()
      const key = path ? `${ip}:${path}` : ip
      const bucket = buckets.get(key)

      if (bucket && now < bucket.resetAt) {
        if (bucket.count >= max) {
          return Math.ceil((bucket.resetAt - now) / 1000)
        }
        bucket.count += 1
        return null
      }

      if (buckets.size >= maxKeys) {
        cleanup()
        while (buckets.size >= maxKeys) {
          const oldest = buckets.keys().next().value
          if (oldest === undefined) break
          buckets.delete(oldest)
        }
      }

      buckets.set(key, { count: 1, resetAt: now + windowMs, path })
      return null
    },

    getRemaining(ip: string): number {
      const now = Date.now()
      const bucket = buckets.get(ip)
      if (!bucket || now >= bucket.resetAt) return max
      return Math.max(0, max - bucket.count)
    },
  }
}
