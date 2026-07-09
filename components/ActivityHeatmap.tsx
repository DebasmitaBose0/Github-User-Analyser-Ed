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
  return
