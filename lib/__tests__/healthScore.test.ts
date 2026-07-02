import { describe, it, expect } from 'vitest'
import { computeHealthScore } from '../healthScore'
import type { Repository } from '@/types/github'

function makeRepo(overrides: Partial<Repository> = {}): Repository {
  return {
    name: 'test-repo',
    description: 'A test repository',
    html_url: 'https://github.com/test/test-repo',
    stargazers_count: 10,
    forks_count: 5,
    language: 'TypeScript',
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('computeHealthScore', () => {
  it('returns Excellent for a well-maintained repo', () => {
    const repo = makeRepo({
      updated_at: new Date().toISOString(),
      open_issues_count: 2,
      closed_issues_count: 18,
      license: 'MIT',
      description: 'A well-documented project',
    })
    const result = computeHealthScore(repo)
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.label).toBe('Excellent')
  })

  it('returns Needs attention for a stale unlicensed repo', () => {
    const repo = makeRepo({
      updated_at: '2024-01-01T00:00:00Z',
      open_issues_count: 0,
      closed_issues_count: 0,
      license: null,
      description: '',
    })
    const result = computeHealthScore(repo)
    expect(result.score).toBeLessThan(40)
    expect(result.label).toBe('Needs attention')
  })

  it('awards full license points when license is present', () => {
    const withLicense = computeHealthScore(makeRepo({ license: 'MIT' }))
    const withoutLicense = computeHealthScore(makeRepo({ license: null }))
    expect(withLicense.breakdown.license).toBe(15)
    expect(withoutLicense.breakdown.license).toBe(0)
  })

  it('awards documentation points for non-empty description', () => {
    const withDesc = computeHealthScore(makeRepo({ description: 'Has a description' }))
    const withoutDesc = computeHealthScore(makeRepo({ description: '' }))
    expect(withDesc.breakdown.documentation).toBe(15)
    expect(withoutDesc.breakdown.documentation).toBe(0)
  })

  it('handles zero total issues gracefully', () => {
    const result = computeHealthScore(makeRepo({ open_issues_count: 0, closed_issues_count: 0 }))
    expect(result.breakdown.issueHealth).toBe(24)
  })

  it('never exceeds 100', () => {
    const repo = makeRepo({
      updated_at: new Date().toISOString(),
      open_issues_count: 0,
      closed_issues_count: 100,
      license: 'Apache-2.0',
      description: 'x'.repeat(100),
    })
    expect(computeHealthScore(repo).score).toBeLessThanOrEqual(100)
  })
})
