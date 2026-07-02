import { describe, it, expect, beforeEach } from 'vitest'
import { getCached, setCached } from '../cache'

describe('cache', () => {
  beforeEach(() => {
    for (const key of ['test-key', 'test-key-2', 'expired-key']) {
      setCached(key, 'placeholder', -1)
    }
  })

  it('stores and retrieves a value within TTL', () => {
    setCached('greeting', 'hello', 5000)
    expect(getCached<string>('greeting')).toBe('hello')
  })

  it('returns null for expired entries', () => {
    setCached('ephemeral', 'gone', -1)
    expect(getCached('ephemeral')).toBeNull()
  })

  it('returns null for missing keys', () => {
    expect(getCached('nonexistent')).toBeNull()
  })

  it('stores objects correctly', () => {
    const obj = { a: 1, b: [2, 3] }
    setCached('myobj', obj, 5000)
    expect(getCached<typeof obj>('myobj')).toEqual(obj)
  })
})
