import type { NextApiRequest } from 'next'

// Per-IP fixed-window rate limiter (in-memory).
//
// This lives in the serverless instance's memory, so it is per-instance and
// resets on cold starts: a meaningful deterrent against scripted abuse of an
// expensive or metered route, not a hard cross-instance guarantee (a durable
// shared store would be the fully robust version). Each client IP is limited
// to `max` requests per `windowMs`; the tracking map itself is bounded by
// `maxKeys` so it cannot grow without limit.
//
// Shared by /api/ai-insight and /api/export/pdf so both routes' limiters stay
// behaviorally identical instead of drifting apart as separate copies.

interface RateWindow {
  count: number
  resetAt: number
}

export function getClientIp(req: NextApiRequest): string {
  // Trust boundary: on the deployment platform (Vercel) the client's real IP is
  // exposed via `x-real-ip` (which the platform sets and the client cannot
  // forge) and is appended as the RIGHTMOST entry of `x-forwarded-for`. The
  // LEFTMOST `x-forwarded-for` entry is attacker-controlled — a client can send
  // a rotating/forged header to get a fresh rate-limit bucket per request — so
  // it must NOT be used for rate limiting. Prefer `x-real-ip`; otherwise take
  // the rightmost forwarded hop; finally fall back to the socket address.
  const realIp = req.headers['x-real-ip']
  if (typeof realIp === 'string' && realIp.trim().length > 0) {
    return realIp.trim()
  }
  if (Array.isArray(realIp) && realIp.length > 0) {
    return realIp[realIp.length - 1].trim()
  }

  const forwarded = req.headers['x-forwarded-for']
  const forwardedValue = Array.isArray(forwarded)
    ? forwarded[forwarded.length - 1]
    : forwarded
  if (typeof forwardedValue === 'string' && forwardedValue.length > 0) {
    const hops = forwardedValue
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean)
    if (hops.length > 0) return hops[hops.length - 1]
  }

  return req.socket.remoteAddress || 'unknown'
}

export interface RateLimiter {
  /** Returns null when the request is allowed, or the number of seconds to
   *  wait before retrying when this IP has exceeded its window. */
  check(ip: string): number | null
}

export function createRateLimiter(windowMs: number, max: number, maxKeys = 5000): RateLimiter {
  const buckets = new Map<string, RateWindow>()

  return {
    check(ip: string): number | null {
      const now = Date.now()
      const bucket = buckets.get(ip)

      if (bucket && now < bucket.resetAt) {
        if (bucket.count >= max) {
          return Math.ceil((bucket.resetAt - now) / 1000)
        }
        bucket.count += 1
        return null
      }

      // Starting a fresh window for this IP: keep the tracking map bounded by
      // dropping expired windows first, then evicting oldest-first if still full.
      if (buckets.size >= maxKeys) {
        for (const [key, entry] of buckets) {
          if (now >= entry.resetAt) buckets.delete(key)
        }
        while (buckets.size >= maxKeys) {
          const oldest = buckets.keys().next().value
          if (oldest === undefined) break
          buckets.delete(oldest)
        }
      }

      buckets.set(ip, { count: 1, resetAt: now + windowMs })
      return null
    },
  }
}
