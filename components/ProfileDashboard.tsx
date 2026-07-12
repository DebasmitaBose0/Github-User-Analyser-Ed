import dynamic from 'next/dynamic'
import ChartSkeleton from '@/components/charts/ChartSkeleton'
import { useState } from 'react'
import UserCard from '@/components/UserCard'
import ActivityHeatmap from '@/components/ActivityHeatmap'
import EngagementStats from '@/components/EngagementStats'
import SponsorsDisplay from '@/components/SponsorsDisplay'
import RepoHealthDashboard from '@/components/RepoHealthDashboard'
import { useRepoDashboard } from '@/hooks/useRepoDashboard'
// recharts-backed and below the fold: split it out of the initial page bundle.
// `ssr: false` is safe here rather than a behaviour change: the dashboard only
// renders after the client-side profile fetch resolves, so this never rendered
// on the server to begin with.
const ProductivityPanel = dynamic(() => import('@/components/ProductivityPanel'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
})
import AchievementsPanel from '@/components/AchievementsPanel'
import AiInsightPanel from '@/components/AiInsightPanel'
import ExportPanel from '@/components/ExportPanel'
import RepoReadmeModal from '@/components/RepoReadmeModal'
import RateLimitBadge from '@/components/RateLimitBadge'
import ActivityTimeline from '@/components/ActivityTimeline'
import ErrorBoundary from '@/components/ErrorBoundary'
import ErrorFallback from '@/components/ErrorFallback'
import WatchlistPanel from '@/components/WatchlistPanel'
import TechStackSection from '@/components/TechStackSection'
import RepoListSection from '@/components/RepoListSection'
import type { Repository, UserData } from '@/types/github'

interface ProfileDashboardProps {
  data: UserData
}

/**
 * Renders a single user's full dashboard (profile card, AI insights, charts,
 * engagement/productivity/achievements, and repositories). Owns the repo
 * sort/filter and README-modal state. Shared by the home page and the
 * /[username] route so both render identically.
 */
export default function ProfileDashboard({ data }: ProfileDashboardProps) {
  const { user, repos, contributions, engagement, productivity, pinnedRepos, rateLimit } = data

  const {
    sortBy,
    setSortBy,
    languageFilter,
    setLanguageFilter,
    repoQuery,
    setRepoQuery,
    languageCounts,
    usingByteData,
    pieData,
    displayedRepos,
  } = useRepoDashboard(data)

  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null)

  return (
    <>
      {/* Fixed-height slot so the badge appearing/disappearing never shifts the
          dashboard layout. */}
      <div className="flex justify-end mb-0 min-h-[1.75rem]">
        {rateLimit && <RateLimitBadge rateLimit={rateLimit} />}
      </div>
      <UserCard user={user} />

      <WatchlistPanel />

      {/* AI Insights + Export & Share — at the top for quick access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <ErrorBoundary fallback={ErrorFallback}>
          <AiInsightPanel
            user={user}
            repos={repos}
            totalContributions={contributions?.totalContributions ?? null}
            productivity={productivity}
          />
        </ErrorBoundary>
        <ErrorBoundary fallback={ErrorFallback}>
          <ExportPanel userData={{ user, repos, contributions, engagement, productivity }} />
        </ErrorBoundary>
      </div>

      <SponsorsDisplay username={user.login} />

      {contributions !== null && engagement !== null && productivity !== null ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <ErrorBoundary fallback={ErrorFallback}>
                <EngagementStats data={engagement} />
              </ErrorBoundary>
              <ErrorBoundary fallback={ErrorFallback}>
                <ProductivityPanel data={productivity} />
              </ErrorBoundary>
              <ErrorBoundary fallback={ErrorFallback}>
                <AchievementsPanel
                  totalContributions={contributions.totalContributions}
                  currentStreak={productivity.currentStreak}
                  totalPullRequests={engagement.totalPullRequestContributions}
                />
              </ErrorBoundary>
            </div>
        ) : (
          <div className="mt-6 bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Engagement, productivity, and achievement stats require server-side GraphQL access (a
              configured GITHUB_TOKEN) or are temporarily unavailable.
            </p>
          </div>
        )}

      <section id="activity" className="scroll-mt-24">
        <div className="flex items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Activity</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {contributions ? (
            <ErrorBoundary fallback={ErrorFallback}>
              <ActivityHeatmap data={contributions} />
            </ErrorBoundary>
          ) : (
            <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 h-full flex items-center justify-center text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Activity heatmap unavailable. This data requires server-side GraphQL access (a
                configured GITHUB_TOKEN) or may be temporarily unavailable.
              </p>
            </div>
          )}

          <ErrorBoundary fallback={ErrorFallback}>
            <ActivityTimeline username={user.login} />
          </ErrorBoundary>
        </div>
      </section>

      <TechStackSection repos={repos} pieData={pieData} usingByteData={usingByteData} />

      <section id="repo-health" className="scroll-mt-24">
        <div className="flex items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Repo Health</h2>
        </div>

        <ErrorBoundary fallback={ErrorFallback}>
          <RepoHealthDashboard repos={repos} />
        </ErrorBoundary>
      </section>

      <section>
        <RepoListSection
          repos={repos}
          pinnedRepos={pinnedRepos}
          displayedRepos={displayedRepos}
          languageCounts={languageCounts}
          sortBy={sortBy}
          onSortChange={setSortBy}
          languageFilter={languageFilter}
          onLanguagesChange={setLanguageFilter}
          repoQuery={repoQuery}
          onRepoQueryChange={setRepoQuery}
          onRepoClick={setSelectedRepo}
        />
      </section>

      {selectedRepo && (
        <RepoReadmeModal
          repo={selectedRepo}
          owner={selectedRepo.owner_login ?? user.login}
          onClose={() => setSelectedRepo(null)}
        />
      )}
    </>
  )
}
