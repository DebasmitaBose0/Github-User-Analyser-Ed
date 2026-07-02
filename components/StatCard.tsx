import { useEffect, useState, useRef } from 'react'

interface StatCardProps {
  label: string
  value: number
  unit?: string
  icon?: React.ReactNode
  color?: string
  formatter?: (value: number) => string
}

function useCountUp(end: number, duration: number = 600): number {
  const [count, setCount] = useState(0)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (end === 0) {
      setCount(0)
      return
    }
    startRef.current = null
    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp
      const elapsed = timestamp - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [end, duration])

  return count
}

function defaultFormatter(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString()
}

export default function StatCard({ label, value, unit, icon, color = '#3b82f6', formatter = defaultFormatter }: StatCardProps) {
  const displayValue = useCountUp(value)

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-4 relative overflow-hidden">
      {icon && (
        <div className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 opacity-50">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <div className="flex items-baseline gap-1">
          <span
            className="text-3xl font-bold transition-colors"
            style={{ color }}
          >
            {formatter(displayValue)}
          </span>
          {unit && (
            <span className="text-sm text-gray-400 dark:text-gray-500">{unit}</span>
          )}
        </div>
      </div>
      <div
        className="absolute bottom-0 left-0 h-0.5 transition-all duration-500 ease-out"
        style={{
          width: `${Math.min((value / (value || 1)) * 100, 100)}%`,
          backgroundColor: color,
        }}
      />
    </div>
  )
}
