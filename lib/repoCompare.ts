import axios from 'axios'
import type { CompareResult } from '@/types/github'

export async function fetchRepoDetail(owner: string, repo: string): Promise<CompareResult> {
  const response = await axios.get<CompareResult>(
    `/api/repo-detail?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
    { validateStatus: () => true }
  )
  return response.data
}

export function parseRepoInput(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim()

  // full URL: https://github.com/owner/repo
  const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/\s?#]+)/)
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] }

  // owner/repo format
  const slashMatch = trimmed.match(/^([^/]+)\/([^/\s]+)$/)
  if (slashMatch) return { owner: slashMatch[1], repo: slashMatch[2] }

  return null
}
