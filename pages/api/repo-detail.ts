import type { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'
import type { CompareResult } from '@/types/github'

interface ErrorResponse {
  error: string
  errorType: 'not_found' | 'rate_limited' | 'unknown'
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CompareResult | ErrorResponse>
) {
  const { owner, repo } = req.query

  if (!owner || !repo || typeof owner !== 'string' || typeof repo !== 'string') {
    return res.status(400).json({ error: 'Missing owner or repo parameter', errorType: 'unknown' })
  }

  const token = process.env.GITHUB_TOKEN

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: 'application/vnd.github.v3+json',
        },
        validateStatus: () => true,
      }
    )

    if (response.status === 404) {
      return res.status(404).json({ error: 'Repository not found', errorType: 'not_found' })
    }
    if (response.status === 403) {
      return res.status(403).json({ error: 'Rate limited', errorType: 'rate_limited' })
    }
    if (response.status !== 200) {
      return res.status(500).json({ error: 'Failed to fetch repository', errorType: 'unknown' })
    }

    const d = response.data
    const result: CompareResult = {
      repoName: d.name,
      owner: d.owner?.login || (owner as string),
      stars: d.stargazers_count ?? 0,
      forks: d.forks_count ?? 0,
      openIssues: d.open_issues_count ?? 0,
      language: d.language ?? '',
      description: d.description ?? '',
      url: d.html_url ?? '',
    }

    return res.status(200).json(result)
  } catch {
    return res.status(500).json({ error: 'Failed to fetch repository', errorType: 'unknown' })
  }
}
