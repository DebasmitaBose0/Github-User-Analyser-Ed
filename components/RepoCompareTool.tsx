import { useState } from 'react'
import type { CompareResult } from '@/types/github'
import { fetchRepoDetail, parseRepoInput } from '@/lib/repoCompare'
import { getLanguageColor } from '@/lib/languageColors'

type CompareField = 'stars' | 'forks' | 'openIssues'

const fieldLabels: Record<CompareField, string> = {
  stars: 'Stars',
  forks: 'Forks',
  openIssues: 'Open Issues',
}

export default function RepoCompareTool() {
  const [inputA, setInputA] = useState('')
  const [inputB, setInputB] = useState('')
  const [repoA, setRepoA] = useState<CompareResult | null>(null)
  const [repoB, setRepoB] = useState<CompareResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCompare = async () => {
    setError(null)
    setRepoA(null)
    setRepoB(null)

    const parsedA = parseRepoInput(inputA)
    const parsedB = parseRepoInput(inputB)

    if (!parsedA || !parsedB) {
      setError('Enter both repos as owner/name or full GitHub URL')
      return
    }

    setLoading(true)
    try {
      const [resultA, resultB] = await Promise.all([
        fetchRepoDetail(parsedA.owner, parsedA.repo),
        fetchRepoDetail(parsedB.owner, parsedB.repo),
      ])

      if ('error' in resultA) {
        setError(`${parsedA.owner}/${parsedA.repo}: ${(resultA as { error: string }).error}`)
      } else if ('error' in resultB) {
        setError(`${parsedB.owner}/${parsedB.repo}: ${(resultB as { error: string }).error}`)
      } else {
        setRepoA(resultA as CompareResult)
        setRepoB(resultB as CompareResult)
      }
    } catch {
      setError('Failed to fetch repository data')
    } finally {
      setLoading(false)
    }
  }

  const getWinner = (field: CompareField): 'a' | 'b' | 'tie' => {
    if (!repoA || !repoB) return 'tie'
    const valA = repoA[field]
    const valB = repoB[field]
    if (valA > valB) return 'a'
    if (valB > valA) return 'b'
    return 'tie'
  }

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 mt-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Repository Compare</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Compare two repositories side by side. Enter as <code className="text-blue-500">owner/repo</code> or paste a full GitHub URL.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Repository A</label>
          <input
            type="text"
            value={inputA}
            onChange={(e) => setInputA(e.target.value)}
            placeholder="facebook/react"
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Repository B</label>
          <input
            type="text"
            value={inputB}
            onChange={(e) => setInputB(e.target.value)}
            placeholder="vercel/next.js"
            className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleCompare}
        disabled={loading}
        className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
      >
        {loading ? 'Loading...' : 'Compare Repos'}
      </button>

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

      {repoA && repoB && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-600">
                <th className="text-left py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">Metric</th>
                <th className="text-center py-2 px-4 text-gray-900 dark:text-white font-semibold">{repoA.repoName}</th>
                <th className="text-center py-2 px-4 text-gray-500 dark:text-gray-400 w-8" />
                <th className="text-center py-2 pl-4 text-gray-900 dark:text-white font-semibold">{repoB.repoName}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">Owner</td>
                <td className="text-center py-3 px-4 text-gray-900 dark:text-white">{repoA.owner}</td>
                <td className="text-center py-3 text-gray-400">vs</td>
                <td className="text-center py-3 pl-4 text-gray-900 dark:text-white">{repoB.owner}</td>
              </tr>
              {(['stars', 'forks', 'openIssues'] as CompareField[]).map((field) => {
                const winner = getWinner(field)
                return (
                  <tr key={field} className="border-b border-gray-100 dark:border-slate-700">
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">{fieldLabels[field]}</td>
                    <td className={`text-center py-3 px-4 font-medium ${
                      winner === 'a' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'
                    }`}>
                      {repoA[field]}
                    </td>
                    <td className="text-center py-3 text-gray-400">
                      {winner === 'a' ? '▲' : winner === 'b' ? '▼' : '—'}
                    </td>
                    <td className={`text-center py-3 pl-4 font-medium ${
                      winner === 'b' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'
                    }`}>
                      {repoB[field]}
                    </td>
                  </tr>
                )
              })}
              <tr>
                <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">Language</td>
                <td className="text-center py-3 px-4">
                  {repoA.language && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getLanguageColor(repoA.language) }} />
                      <span className="text-gray-900 dark:text-white">{repoA.language}</span>
                    </span>
                  )}
                </td>
                <td className="text-center py-3 text-gray-400">vs</td>
                <td className="text-center py-3 pl-4">
                  {repoB.language && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getLanguageColor(repoB.language) }} />
                      <span className="text-gray-900 dark:text-white">{repoB.language}</span>
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
