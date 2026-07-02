// Simple in-memory TTL cache for API route responses.
//
// Caveat: this lives in the Node.js process's memory, so it persists across
// requests as long as the *same* serverless instance stays warm, but it is
// not shared across instances and will reset on cold starts/redeploys. For
// local dev (`next dev`) and low-traffic deployments this still meaningfully
// cuts down on repeated GitHub API calls for the same username in a short
// window.

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

// Hard ceiling on live entries. Together with the prune-on-write below this
// gives the cache a bounded memory footprint even when a long tail of distinct
// keys (e.g. one badge per username) expires without ever being read again.
const MAX_ENTRIES = 500

function pruneExpired(): void {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key)
  }
}

export function getCached<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.value as T
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  // Drop expired entries first so a burst of new keys doesn't evict entries
  // that are merely old-but-still-valid.
  pruneExpired()
  // If still at capacity for a genuinely new key, evict oldest-first (Map
  // preserves insertion order) until there is room.
  if (!store.has(key)) {
    while (store.size >= MAX_ENTRIES) {
      const oldest = store.keys().next().value
      if (oldest === undefined) break
      store.delete(oldest)
    }
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}