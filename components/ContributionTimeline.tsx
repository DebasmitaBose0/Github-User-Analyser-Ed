import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import type { ContributionsData } from '@/types/github'
import { useTheme } from '@/lib/ThemeContext'

interface ContributionTimelineProps {
  data: ContributionsData
}

interface TimelinePoint {
  date: string
  count: number
  cumulative: number
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default function ContributionTimeline({ data }: ContributionTimelineProps) {
  const { theme } = useTheme()
  const tickColor = theme === 'dark' ? '#94a3b8' : '#64748b'
  const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0'
  const areaFill = theme === 'dark' ? '#1e40af' : '#3b82f6'

  const [view, setView] = useState<'daily' | 'cumulative'>('daily')

  const timeline: TimelinePoint[] = useMemo(() => {
    let cumulative = 0
    const points: TimelinePoint[] = []
    for (const week of data.weeks) {
      for (const day of week.contributionDays) {
        cumulative += day.count
        points.push({ date: day.date, count: day.count, cumulative })
      }
    }
    return points
  }, [data])

  const sampleInterval = Math.max(1, Math.floor(timeline.length / 60))
  const sampled = timeline.filter((_, i) => i % sampleInterval === 0 || i === timeline.length - 1)

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Contribution Timeline</h3>
        <div className="flex rounded-md overflow-hidden border border-gray-200 dark:border-slate-600">
          <button
            onClick={() => setView('daily')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              view === 'daily'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setView('cumulative')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              view === 'cumulative'
                ? 'bg-blue-500 text-white'
                : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600'
            }`}
          >
            Cumulative
          </button>
        </div>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sampled} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="contribGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={areaFill} stopOpacity={0.3} />
                <stop offset="95%" stopColor={areaFill} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => formatDate(d)}
              tick={{ fill: tickColor, fontSize: 10 }}
              axisLine={{ stroke: gridColor }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={{ stroke: gridColor }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                const entry = payload[0].payload as TimelinePoint
                return (
                  <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded px-3 py-2 text-sm text-gray-900 dark:text-white shadow-lg">
                    <div className="font-semibold">{formatDate(entry.date)}</div>
                    <div>{entry.count} contributions</div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">
                      Total: {entry.cumulative.toLocaleString()}
                    </div>
                  </div>
                )
              }}
            />
            <Area
              type="monotone"
              dataKey={view === 'daily' ? 'count' : 'cumulative'}
              stroke={areaFill}
              strokeWidth={2}
              fill="url(#contribGradient)"
              dot={false}
              activeDot={{ r: 4, fill: areaFill }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
