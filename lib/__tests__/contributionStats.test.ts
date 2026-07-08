import { computeCurrentStreak, computeProductivityStats } from '@/lib/contributionStats'
import type { ContributionDay, ContributionWeek } from '@/types/github'

const TODAY = '2026-06-15'
const NOW_MS = new Date(`${TODAY}T12:00:00.000Z`).getTime()

function day(date: string, count: number): ContributionDay {
  return { date, count }
}

/** Build consecutive daily entries ending on `endDate`, oldest first. */
function consecutiveDays(endDate: string, counts: number[]): ContributionDay[] {
  const end = new Date(`${endDate}T00:00:00Z`).getTime()
  const dayMs = 24 * 60 * 60 * 1000
  return counts.map((count, i) => {
    const d = new Date(end - (counts.length - 1 - i) * dayMs)
    return day(d.toISOString().slice(0, 10), count)
  })
}

beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(NOW_MS)
})

afterAll(() => {
  jest.useRealTimers()
})
