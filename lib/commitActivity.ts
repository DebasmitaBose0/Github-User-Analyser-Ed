import axios from 'axios'
import type { CommitActivity } from '@/types/github'

export async function fetchCommitActivity(owner: string, repo: string): Promise<CommitActivity[]> {
  const response = await axios.get<CommitActivity[]>(
    `/api/commit-activity?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
    { validateStatus: () => true }
  )
  return response.data
}
