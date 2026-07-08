import type { ContributionsData } from '@/types/github'
import CustomChartContainer from './charts/CustomChartContainer'

interface ActivityHeatmapProps {
  data: ContributionsData
}

const LEVEL_COLORS = [
  'bg-gray-200 dark:bg-slate-700/60', // 0 contributions
  'bg-blue-200 dark:bg-blue-900',
  'bg-blue-400 dark:bg-blue-700',
  'bg-blue-600 dark:bg-blue-500',
  'bg-blue-700 dark:bg-blue-400',
]

function levelFor(count: number, max: number): number {
  if (count === 0) return 0
  if (max <= 4) return count >= max ? 4 : 3
  const ratio = count / max
  if (ratio > 0.75) return 4
  if (ratio > 0.5) return 3
  if (ratio > 0.25) return 2
  return 1
}

function monthLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short' })
}

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  const { weeks, totalContributions } = data

  const allCounts = weeks.flatMap((w) => w.contributionDays.map((d) => d.count))
  const maxCount = Math.max(...allCounts, 1)

  // Bug Fix 1: Properly calculate when a new month actually starts
  let lastMonth = ''
  const monthMarkers = weeks.map((week, i) => {
    const firstDay = week.contributionDays[0]
    if (!firstDay) return ''

    // Always label the very first week shown
    if (i === 0) {
      lastMonth = monthLabel(firstDay.date)
      return lastMonth
    }

    // For other weeks, check if the month starts in this week (day ends with -01)
    const firstDayOfMonth = week.contributionDays.find((d) => d.date.endsWith('-01'))
    if (firstDayOfMonth) {
      lastMonth = monthLabel(firstDayOfMonth.date)
      return lastMonth
    }

    return ''
  })

  // Generate today's date in YYYY-MM-DD format to filter out future days
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`

  return (
    <CustomChartContainer title="Activity Heatmap" height="auto">
      <div className="flex justify-between items-center -mt-2 mb-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {totalContributions.toLocaleString()} contributions in the last year
        </span>
      </div>

      <div
        className="overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        tabIndex={0}
        role="region"
        aria-label="Activity contributions heatmap"
      >
        <div className="inline-flex gap-[3px] min-w-full">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-[3px]">
              <div className="h-3 text-[10px] text-gray-400 dark:text-gray-500 leading-3 whitespace-nowrap">
                {monthMarkers[weekIdx]}
              </div>
              {week.contributionDays.map((day) => {
                // Bug Fix 2: Don't render blocks for days in the future
                if (day.date > todayStr) {
                  // Return invisible block to maintain flex grid alignment
                  return <div key={day.date} className="w-3 h-3" />
                }

                const level = levelFor(day.count, maxCount)
                return (
                  <div
                    key={day
