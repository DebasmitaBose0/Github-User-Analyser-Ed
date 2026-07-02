import { describe, it, expect } from 'vitest'
import { computeCurrentStreak } from '../contributionStats'
import type { ContributionDay } from '@/types/github'

function day(date: string, count: number): ContributionDay {
  return { date, count }
}

describe('computeCurrentStreak', () => {
  it('returns 0 for empty array', () => {
    expect(computeCurrentStreak([])).toBe(0)
  })

  it('counts consecutive contributions from the end', () => {
    const days = [
      day('2026-06-01', 5),
      day('2026-06-02', 3),
      day('2026-06-03', 0),
      day('2026-06-04', 2),
      day('2026-06-05', 1),
    ]
    expect(computeCurrentStreak(days)).toBe(2)
  })

  it('skips zero-count today when it is the current day', () => {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const days = [day(yesterday, 3), day(today, 0)]
    expect(computeCurrentStreak(days)).toBe(1)
  })

  it('returns 0 when the last non-today day has zero contributions', () => {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    const days = [day(yesterday, 0), day(today, 0)]
    expect(computeCurrentStreak(days)).toBe(0)
  })

  it('returns 1 for a single contribution day', () => {
    const days = [day('2026-06-01', 7)]
    expect(computeCurrentStreak(days)).toBe(1)
  })

  it('handles a long continuous streak', () => {
    const days: ContributionDay[] = []
    for (let i = 30; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
      days.push(day(d, 1))
    }
    expect(computeCurrentStreak(days)).toBe(31)
  })
})
