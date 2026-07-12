import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import type { GetServerSideProps } from 'next'
import { resolveBaseUrl } from '@/lib/siteUrl'
import { fetchUserData } from '@/lib/github'
import { validateUsername } from '@/lib/validation'
import CompareForm from '@/components/CompareForm'
import CompareResult from '@/components/CompareResult'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import ThemeToggle from '@/components/ThemeToggle'
import Footer from '@/components/Footer'
import type { UserData } from '@/types/github'

interface OgMeta {
  title: string
  description: string
  url: string
  image: string
}

interface ComparePageProps {
  user1: string
  user2: string
  /** Set when a username in the URL is malformed — so we never fetch it. */
  invalidReason: string | null
  og: OgMeta
}

export default function ComparePage({ user1, user2, invalidReason, og }: ComparePageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userA, setUserA] = useState<UserData | null>(null)
  const [userB, setUserB] = useState<UserData | null>(null)

  const hasBoth = Boolean(user1 && user2)

  useEffect(() => {
    // Nothing to fetch: either the URL carries no pair, or one of the names is malformed and
    // was rejected server-side. Either way we render a message, not a request.
    if (!hasBoth || invalidReason) {
      setUserA(null)
      setUserB(null)
      setError('')
      setLoading(false)
      return
    }

    // If someone runs a second comparison before the first resolves, the slower response must
    // not overwrite the newer one — otherwise the page can end up showing a pair the URL no
    // longer describes.
    let cancelled = false

    setLoading(true)
    setError('')
    setUserA(null)
    setUserB(null)

    Promise.all([fetchUserData(user1), fetchUserData(user2)])
      .then(([dataA, dataB]) => {
        if (cancelled) return

        // `fetchUserData` resolves every status and reports the failure on `data.error`, so a
        // bad username stays attributable to *which* user it was rather than collapsing into a
        // single "something went wrong" — that's the behaviour the home page had, kept here.
        if (dataA.error) {
          setError(`${user1}: ${dataA.error}`)
        } else if (dataB.error) {
          setError(`${user2}: ${dataB.error}`)
        } else {
          setUserA(dataA)
          setUserB(dataB)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to fetch one or both profiles')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // Re-runs whenever the URL changes, which is what makes a refresh, a Back, or a pasted link
    // all behave identically — the query string is the single source of truth for this page.
  }, [user1, user2, hasBoth, invalidReason])

  const handleCompare = (rawA: string, rawB: string) => {
    const nextA = rawA.trim()
    const nextB = rawB.trim()
    if (!nextA || !nextB) return

    // `push`, not `replace`, so Back returns to the previous comparison rather than skipping
    // out of the page entirely.
    router.push({ pathname: '/compare', query: { user1: nextA, user2: nextB } })
  }

  return (
    <>
      <Head>
        <title>{og.title}</title>
        <meta name="description" content={og.description} />
        <link rel="canonical" href={og.url} />

        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="GitHub User Analyser" />
        <meta property="og:title" content={og.title} />
        <meta property="og:description" content={og.description} />
        <meta property="og:image" content={og.image} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="GitHub User Analyser" />
        <meta property="og:url" content={og.url} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={og.title} />
        <meta name="twitter:description" content={og.description} />
        <meta name="twitter:image" content={og.image} />
      </Head>

      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
        <main className="flex-1 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),transparent_25%),linear-gradient(180deg,#f8fafc,#e2e8f0)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),transparent_25%),linear-gradient(180deg,#020617,#0f172a)]">
          <div className="mx-auto max-w-6xl px-4 pt-0 lg:pt-4 pb-10 sm:pb-12 lg:pb-16">
            <div className="mb-6 flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-4 no-underline">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-cyan-500/15 text-cyan-700 ring-1 ring-cyan-300/20 dark:text-cyan-300">
                  <span className="text-xl font-semibold">GH</span>
                </div>
                <p className="text-2xl font-semibold text-cyan-700 sm:text-3xl dark:text-cyan-300">
                  GitHub User Analyser
                </p>
              </Link>
              <ThemeToggle />
            </div>

            <div className="rounded-[2rem] border border-slate-200/20 bg-white/90 px-6 pt-5 pb-6 shadow-2xl shadow-slate-900/5 sm:px-8 dark:border-white/10 dark:bg-slate-900/90 dark:shadow-slate-950/30">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                  Compare
                </p>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {hasBoth ? `${user1} vs ${user2}` : 'Compare GitHub profiles'}
                </h1>
              </div>

              <div className="space-y-3">
                <CompareForm onCompare={handleCompare} loading={loading} />

                {invalidReason && (
                  <div className="text-sm text-rose-500 dark:text-rose-300">{invalidReason}</div>
                )}

                {error && !invalidReason && (
                  <div className="text-sm text-rose-500 dark:text-rose-300">{error}</div>
                )}

                {loading && <LoadingSkeleton />}

                {!loading && !error && !invalidReason && userA && userB && (
                  <CompareResult userA={userA} userB={userB} />
                )}

                {!loading && !error && !invalidReason && !hasBoth && (
                  <div className="text-slate-600 dark:text-slate-300">
                    Add two usernames to compare their public GitHub stats.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<ComparePageProps> = async ({ query, req }) => {
  // A query string is allowed to repeat a key (`?user1=a&user1=b`), which Next surfaces as an
  // array. Take the first, the same way /[username] handles its route param.
  const first = (value: string | string[] | undefined): string =>
    (Array.isArray(value) ? value[0] : value) ?? ''

  const user1 = first(query.user1).trim()
  const user2 = first(query.user2).trim()

  // Validate on the server, not in the browser. These names arrive from a URL anyone can edit,
  // and rejecting a malformed one here means it never reaches `fetchUserData` at all — a shared
  // bad link renders an explanation instead of firing a request that was always going to fail.
  //
  // `validateUsername` returns a reason rather than throwing (unlike `securitySanitizer`'s
  // version), which is what lets us say *why* the link is broken.
  let invalidReason: string | null = null
  if (user1 || user2) {
    const checkedA = validateUsername(user1)
    const checkedB = validateUsername(user2)

    if (!checkedA.valid) {
      invalidReason = `${user1 || 'First username'}: ${checkedA.reason}`
    } else if (!checkedB.valid) {
      invalidReason = `${user2 || 'Second username'}: ${checkedB.reason}`
    }
  }

  const baseUrl = resolveBaseUrl(req)
  const hasBoth = Boolean(user1 && user2)

  // Derived from the query alone — no GitHub call — so the page renders with no added latency.
  // This mirrors how /[username] builds its tags from the route rather than from fetched data.
  const title = hasBoth
    ? `${user1} vs ${user2} · GitHub User Analyser`
    : 'Compare · GitHub User Analyser'

  const description = hasBoth
    ? `Compare @${user1} and @${user2} side by side — repositories, stars, languages and contribution activity.`
    : 'Compare two GitHub profiles side by side.'

  const path = hasBoth
    ? `/compare?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}`
    : '/compare'

  const og: OgMeta = {
    title,
    description,
    // Absolute URLs come from the shared resolver so every page agrees on the host, including
    // behind a proxy; it falls back to a root-relative path when nothing is configured.
    url: baseUrl ? `${baseUrl}${path}` : path,
    image: baseUrl ? `${baseUrl}/og-default.png` : '/og-default.png',
  }

  return { props: { user1, user2, invalidReason, og } }
}
