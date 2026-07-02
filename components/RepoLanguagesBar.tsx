import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Cell } from 'recharts'
import { getLanguageColor } from '@/lib/languageColors'
import { useTheme } from '@/lib/ThemeContext'

interface RepoLanguagesBarProps {
  data: { name: string; value: number }[]
  title?: string
}

export default function RepoLanguagesBar({ data, title = 'Languages by Repository Count' }: RepoLanguagesBarProps) {
  const { theme } = useTheme()
  const tickColor = theme === 'dark' ? '#94a3b8' : '#64748b'
  const gridColor = theme === 'dark' ? '#334155' : '#e2e8f0'

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 h-full flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">No language data available</p>
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, 12)

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 h-full">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
            <XAxis type="number" tick={{ fill: tickColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: tickColor, fontSize: 11 }}
              axisLine={{ stroke: gridColor }}
              width={90}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null
                return (
                  <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded px-3 py-2 text-sm text-gray-900 dark:text-white shadow-lg">
                    <span className="font-semibold">{label}</span>: {payload[0].value} repos
                  </div>
                )
              }}
            />
            <Bar dataKey="value" radius={[0, 3, 3, 0]}>
              {sorted.map((entry) => (
                <Cell key={entry.name} fill={getLanguageColor(entry.name)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
