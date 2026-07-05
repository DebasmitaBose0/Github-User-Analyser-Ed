import type { UserData } from '@/types/github'
import { fetchUserData as apiFetch } from './apiClient'

interface PendingPromise {
  promise: Promise<UserData>
  timestamp: number
}

const pendingMap = new Map<string, PendingPromise>()
const DEDUP_TTL_MS = 1500

export async function fetchUserData(username: string): Promise<UserData> {
  const key = `fetch:${username.toLowerCase().trim()}`
  const existing = pendingMap.get(key)

  if (existing && Date.now() - existing.timestamp < DEDUP_TTL_MS) {
    return existing.promise
  }

  const promise = apiFetch(username).catch((err) => {
    return {
      user: {} as UserData['user'],
      repos: [],
      contributions: null,
      engagement: null,
      productivity: null,
      pinnedRepos: [],
      error: err.message || 'Failed to fetch GitHub data',
      errorType: err.statusCode === 404 ? 'not_found' : err.statusCode === 403 ? 'rate_limited' : 'unknown',
    } as UserData
  })

  pendingMap.set(key, { promise, timestamp: Date.now() })

  promise.finally(() => {
    if (pendingMap.get(key)?.promise === promise) {
      pendingMap.delete(key)
    }
  })

  return promise
}
