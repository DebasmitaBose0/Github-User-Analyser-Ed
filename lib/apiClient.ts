import axios, { type AxiosError } from 'axios'
import type { UserData } from '@/types/github'

interface PendingRequest {
  promise: Promise<UserData>
  timestamp: number
}

const pendingMap = new Map<string, PendingRequest>()
const DEDUP_TTL_MS = 2000

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorType: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function fetchUserData(username: string, signal?: AbortSignal): Promise<UserData> {
  const normalized = username.toLowerCase().trim()
  const cacheKey = `fetch:${normalized}`

  const existing = pendingMap.get(cacheKey)
  if (existing && Date.now() - existing.timestamp < DEDUP_TTL_MS) {
    return existing.promise
  }

  const promise = (async () => {
    try {
      const response = await axios.get<UserData>(`/api/github?username=${encodeURIComponent(normalized)}`, {
        signal,
        timeout: 15000,
      })
      return response.data
    } catch (err: unknown) {
      if (axios.isCancel(err)) {
        throw err
      }
      const error = err as AxiosError<{ error?: string; errorType?: string }>
      const statusCode = error.response?.status || 500
      const errorMessage = error.response?.data?.error || 'Failed to fetch GitHub data'
      const errorType = error.response?.data?.errorType || 'unknown'
      throw new ApiError(errorMessage, statusCode, errorType)
    } finally {
      pendingMap.delete(cacheKey)
    }
  })()

  pendingMap.set(cacheKey, { promise, timestamp: Date.now() })
  return promise
}
