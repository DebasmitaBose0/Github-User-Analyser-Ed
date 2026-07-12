import { useSyncExternalStore } from 'react'
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from '@/lib/watchlist'
import type { Repository, GitHubUser } from '@/types/github'

type WatchlistButtonProps =
  | { target: Repository; type: 'repo' }
  | { target: GitHubUser; type: 'user' }

function subscribe(cb: () => void): () => void {
  window.addEventListener('storage', cb)
  return () => window.removeEventListener('storage', cb)
}

function getSnapshot(type: 'repo' | 'user', id: string): boolean {
  return isInWatchlist(`${type}-${id}`)
}

export default function WatchlistButton(props: WatchlistButtonProps) {
  const id = props.type === 'repo' ? `${props.type}-${props.target.name}` : `${props.type}-${props.target.login}`
  const name = props.type === 'repo' ? props.target.name : props.target.login
  const login = props.type === 'repo' ? undefined : props.target.login

  const watched = useSyncExternalStorage(id, props.type)

  const handleToggle = () => {
    if (watched) {
      removeFromWatchlist(id)
    } else {
      addToWatchlist({
        id,
        type: props.type,
        name:
          props.type === 'user'
            ? (login ?? name)
            : `${(props.target as Repository).owner_login ?? ''}/${name}`,
        data:
          props.type === 'repo'
            ? { stars: (props.target as Repository).stargazers_count }
            : { repos: (props.target as GitHubUser).public_repos },
      })
    }
    window.dispatchEvent(new Event('storage'))
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
        watched
          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800'
          : 'bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-500 hover:bg-gray-200 dark:hover:bg-slate-500'
      }`}
    >
      <svg className="w-3.5 h-3.5" fill={watched ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {watched ? 'Watched' : 'Watch'}
    </button>
  )
}

function useSyncExternalStorage(id: string, type: 'repo' | 'user'): boolean {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot(type, id),
    () => false
  )
}
