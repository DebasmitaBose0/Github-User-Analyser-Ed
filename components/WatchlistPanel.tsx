import { useState, useEffect, useCallback } from 'react'
import { getWatchlist, removeFromWatchlist, clearWatchlist } from '@/lib/watchlist'
import type { WatchlistItem } from '@/types/github'

export default function WatchlistPanel() {
  const [items, setItems] = useState<WatchlistItem[]>([])
  const [collapsed, setCollapsed] = useState(true)

  const refresh = useCallback(() => setItems(getWatchlist()), [])

  useEffect(() => {
    refresh()
    const handler = () => refresh()
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [refresh])

  if (items.length === 0 && collapsed) return null

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 mt-6">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Watchlist {items.length > 0 && `(${items.length})`}
        </h2>
        <span className="text-xs text-gray-400">{collapsed ? 'Show' : 'Hide'}</span>
      </button>

      {!collapsed && (
        <div className="mt-4">
          {items.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your watchlist is empty. Click the star icon on any user or repo to add it.
            </p>
          ) : (
            <>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-600/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {item.type === 'user' ? '👤 ' : '📦 '}
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.type === 'user' ? 'User' : 'Repository'}
                        {item.data && 'stars' in item.data && ` · ${item.data.stars} stars`}
                        {item.data && 'repos' in item.data && ` · ${item.data.repos} repos`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        removeFromWatchlist(item.id)
                        window.dispatchEvent(new Event('storage'))
                        refresh()
                      }}
                      className="shrink-0 px-2 py-1 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  clearWatchlist()
                  window.dispatchEvent(new Event('storage'))
                  refresh()
                }}
                className="mt-3 w-full py-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear All
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
