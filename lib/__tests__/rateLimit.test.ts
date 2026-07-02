import { describe, it, expect } from 'vitest'
import { createRateLimiter } from '../rateLimit'

describe('createRateLimiter', () => {
  it('allows requests within the limit', () => {
    const limiter = createRateLimiter(60000, 5)
    for (let i = 0; i < 5; i++) {
      expect(limiter.check('127.0.0.1')).toBeNull()
    }
  })

  it('blocks requests exceeding the limit', () => {
    const limiter = createRateLimiter(60000, 2)
    limiter.check('10.0.0.1')
    limiter.check('10.0.0.1')
    const result = limiter.check('10.0.0.1')
    expect(result).not.toBeNull()
    expect(typeof result).toBe('number')
  })

  it('tracks different IPs independently', () => {
    const limiter = createRateLimiter(60000, 1)
    expect(limiter.check('1.1.1.1')).toBeNull()
    expect(limiter.check('2.2.2.2')).toBeNull()
    expect(limiter.check('1.1.1.1')).not.toBeNull()
    expect(limiter.check('2.2.2.2')).not.toBeNull()
  })
})
