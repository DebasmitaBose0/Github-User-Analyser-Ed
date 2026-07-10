import { useEffect, useMemo, useState } from 'react'
import type { SortOption, UserData } from '@/types/github'
import {
  aggregateLanguagesByBytes,
  aggregateLanguagesByCount,
  hasByteLanguageData,
} from '@/lib/repoStats'
import { filterAndSortRepos } from '@/lib/repoFiltering'

/**
 * Owns the repository sort/filter state and all derived data for the dashboard
 * (language aggregation + the filtered/sorted repo list). Keeps ProfileDashboard
 * a thin container and makes the transformation reusable/testable. The pure
 * transformation itself lives in `filterAndSortRepos`.
 */
export function useRepoDashboard(data: UserData) {
  const { user, repos } = data

  const [sortBy, setSortBy] = useState<SortOption>('stars')
  const [languageFilter, setLanguageFilter] = useState<string[]>([])
  const [repoQuery, setRepoQuery] = useState('')

  // Clear the repo name search when navigating to a different profile.
  useEffect(() => {
    setRepoQuery('')
  }, [user.login])

  // Language counts across ALL repos — always available, used for filter pills.
  const languageCounts = useMemo(() => aggregateLanguagesByCount(repos), [repos])

  // Byte-accurate distribution when available (GraphQL path), otherwise fall
  // back to repo-count based percentages so the chart still renders.
  const byteDistribution = useMemo(() => aggregateLanguagesByBytes(repos), [repos])
  const usingByteData = useMemo(() => hasByteLanguageData(repos), [repos])

  const pieData = useMemo(() => {
    if (usingByteData) return byteDistribution
    return languageCounts.map(({ name, count }) => ({ name, value: count }))
  }, [usingByteData, byteDistribution, languageCounts])

  const displayedRepos = useMemo(
    () => filterAndSortRepos(repos, sortBy, languageFilter, repoQuery),
    [repos, sortBy, languageFilter, repoQuery]
  )

  return {
    sortBy,
    setSortBy,
    languageFilter,
    setLanguageFilter,
    repoQuery,
    setRepoQuery,
    languageCounts,
    byteDistribution,
    usingByteData,
    pieData,
    displayedRepos,
  }
}
