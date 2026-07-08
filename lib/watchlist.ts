import type { WatchlistItem } from '@/types/github'

const STORAGE_KEY = 'github-analyzer-watchlist'

function loadRaw(): WatchlistItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(items: WatchlistItem[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function getWatchlist(): WatchlistItem[] {
  return loadRaw()
}

export function addToWatchlist(item: Omit<WatchlistItem, 'addedAt'>): WatchlistItem[] {
  const items = loadRaw()
  if (items.some((i) => i.id === item.id)) return items
  const newItem: WatchlistItem = { ...item, addedAt: new Date().toISOString() }
  const updated = [newItem, ...items]
  save(updated)
  return updated
}

export function removeFromWatchlist(id: string): WatchlistItem[] {
  const items = loadRaw().filter((i) => i.id !== id)
  save(items)
  return items
}

export function isInWatchlist(id: string): boolean {
  return loadRaw().some((i) => i.id === id)
}

export function clearWatchlist(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function watchlistListener(callback: (items: WatchlistItem[]) => void): () => void {
  const handler = () => callback(loadRaw())
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
