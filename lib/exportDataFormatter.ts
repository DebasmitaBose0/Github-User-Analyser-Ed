import type { UserData } from '@/types/github'

/** Selectable sections of a profile export. */
export type ExportSection =
  | 'profile'
  | 'repositories'
  | 'contributions'
  | 'engagement'
  | 'productivity'

/** All sections, in the canonical output order. */
export const ALL_EXPORT_SECTIONS: ExportSection[] = [
  'profile',
  'contributions',
  'engagement',
  'productivity',
  'repositories',
]

/**
 * Serializes a profile to pretty-printed JSON. When `sections` is omitted, every
 * section is included and the output is identical to the full-profile export;
 * pass a subset to export only those sections.
 */
export function formatAsJSON(
  userData: UserData,
  sections: ExportSection[] = ALL_EXPORT_SECTIONS
): string {
  const include = new Set(sections)
  const out: Record<string, unknown> = {}

  if (include.has('profile')) {
    out.username = userData.user.login
    out.name = userData.user.name
    out.bio = userData.user.bio
    out.publicReposCount = userData.user.public_repos
    out.followers = userData.user.followers
    out.following = userData.user.following
  }
  if (include.has('contributions')) {
    out.totalContributions = userData.contributions?.totalContributions || 0
  }
  if (include.has('engagement')) {
    out.engagement = userData.engagement || null
  }
  if (include.has('productivity')) {
    out.productivity = userData.productivity || null
  }
  if (include.has('repositories')) {
    out.repositories = (userData.repos || []).map((repo) => ({
      name: repo.name,
      description: repo.description,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      updatedAt: repo.updated_at,
      htmlUrl: repo.html_url,
    }))
  }

  return JSON.stringify(out, null, 2)
}
