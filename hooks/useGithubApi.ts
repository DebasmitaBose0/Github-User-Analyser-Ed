import { useState, useCallback, useRef, useEffect } from 'react'
import { fetchUserData, ApiError } from '@/lib/apiClient'
import type { UserData } from '@/types/github'

interface UseGithubApiState {
  data: UserData | null
  loading: boolean
  error: string | null
}

export function useGithubApi() {
  const [state, setState] = useState<UseGithubApiState>({
    data: null,
    loading: false,
    error: null,
  })
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const searchUser = useCallback(async (username: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState({ data: null, loading: true, error: null })

    try {
      const data = await fetchUserData(username, controller.signal)
      if (!controller.signal.aborted) {
        setState({ data, loading: false, error: null })
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return
      const message = err instanceof ApiError ? err.message : 'An unexpected error occurred'
      setState({ data: null, loading: false, error: message })
    }
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState({ data: null, loading: false, error: null })
  }, [])

  return { ...state, searchUser, reset }
}
