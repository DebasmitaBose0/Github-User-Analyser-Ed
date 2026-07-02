import type { NextApiRequest, NextApiResponse } from 'next'
import axios, { type AxiosError } from 'axios'

interface AiInsightRequestBody {
  type: 'bio' | 'roast'
  username: string
  bio?: string
  topLanguages: string[]
  topRepos: { name: string; description: string; stars: number }[]
  totalContributions?: number
  currentStreak?: number
  weekdayPct?: number
  weekendPct?: number
}

interface AiInsightResponse {
  text: string | null
  error?: string
}

// gemini-2.5-flash-lite is the most generous free-tier model as of mid-2026.
// See https://ai.google.dev/gemini-api/docs/models for current free-tier eligibility.
const GEMINI_MODEL = 'gemini-2.5-flash-lite'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

function buildPrompt(body: AiInsightRequestBody): string {
  const repoList =
    body.topRepos
      .map((r) => `- ${r.name} (${r.stars} stars): ${r.description || 'no description'}`)
      .join('\n') || 'none listed'
  const languages = body.topLanguages.join(', ') || 'unknown'

  const shared = `GitHub user: @${body.username}
Bio: ${body.bio || 'none provided'}
Top languages: ${languages}
Top repositories:
${repoList}
Total contributions (last year): ${body.totalContributions ?? 'unknown'}
Current streak: ${body.currentStreak ?? 'unknown'} days
Weekday vs weekend activity split: ${body.weekdayPct ?? '?'}% weekday / ${body.weekendPct ?? '?'}% weekend`

  if (body.type === 'bio') {
    return `You are writing a short, polished professional bio for a developer's GitHub README, based on the data below. Write 3-4 sentences, highlighting their apparent technical focus and strengths based on the languages and repos listed. Do not invent facts that aren't supported by the data, and don't pad with generic filler. Keep it confident and specific.

${shared}

Return only the bio text. No preamble, no markdown headers, no quotation marks around it.`
  }

  return `You are writing a short, PLAYFUL, good-natured "roast or toast" of a developer's GitHub activity, based on the data below. Keep it affectionate teasing at most, like a friend ribbing them, never genuinely insulting, never comment on their intelligence or worth as a person or professional. Base every joke only on the observable patterns below (commit timing habits, language choices, repo names, streaks). Don't invent facts. 2-4 short sentences, end on a warm note.

${shared}

Return only the roast text. No preamble, no markdown headers, no quotation marks around it.`
}

// ---------------------------------------------------------------------------
// Per-IP fixed-window rate limiter (in-memory).
//
// This lives in the serverless instance's memory, so it is per-instance and
// resets on cold starts: a meaningful deterrent against scripted abuse of the
// metered Gemini call, not a hard cross-instance guarantee (a durable shared
// store would be the fully robust version). Each client IP is limited to
// RATE_LIMIT_MAX requests per RATE_LIMIT_WINDOW_MS; the tracking map itself is
// bounded by RATE_LIMIT_MAX_IPS so it cannot grow without limit.
const RATE_LIMIT_WINDOW_MS = 60000
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_MAX_IPS = 5000

interface RateWindow {
  count: number
  resetAt: number
}

const rateBuckets = new Map<string, RateWindow>()

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim()
  }
  return req.socket.remoteAddress || 'unknown'
}

// Returns null when the request is allowed, or the number of seconds to wait
// before retrying when this IP has exceeded its window.
function checkRateLimit(ip: string): number | null {
  const now = Date.now()
  const bucket = rateBuckets.get(ip)

  if (bucket && now < bucket.resetAt) {
    if (bucket.count >= RATE_LIMIT_MAX) {
      return Math.ceil((bucket.resetAt - now) / 1000)
    }
    bucket.count += 1
    return null
  }

  // Starting a fresh window for this IP: keep the tracking map bounded by
  // dropping expired windows first, then evicting oldest-first if still full.
  if (rateBuckets.size >= RATE_LIMIT_MAX_IPS) {
    for (const [key, entry] of rateBuckets) {
      if (now >= entry.resetAt) rateBuckets.delete(key)
    }
    while (rateBuckets.size >= RATE_LIMIT_MAX_IPS) {
      const oldest = rateBuckets.keys().next().value
      if (oldest === undefined) break
      rateBuckets.delete(oldest)
    }
  }

  rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
  return null
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AiInsightResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ text: null, error: 'Method not allowed' })
  }

  if (!process.env.GEMINI_API_KEY) {
    return res
      .status(503)
      .json({ text: null, error: 'AI insights are not configured on this server (missing GEMINI_API_KEY)' })
  }

  const clientIp = getClientIp(req)
  const retryAfter = checkRateLimit(clientIp)
  if (retryAfter !== null) {
    res.setHeader('Retry-After', String(retryAfter))
    return res.status(429).json({
      text: null,
      error: `Too many requests \u2014 please wait ${retryAfter}s and try again`,
    })
  }

  const body = req.body as AiInsightRequestBody
  if (!body || !body.username || (body.type !== 'bio' && body.type !== 'roast')) {
    return res.status(400).json({ text: null, error: 'Invalid request' })
  }

  try {
    const prompt = buildPrompt(body)

    const response = await axios.post(
      GEMINI_URL,
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: body.type === 'roast' ? 0.9 : 0.6,
          // Raised from 300 → 1024: gemini-2.5-flash-lite can run internal
          // reasoning/thinking that counts against maxOutputTokens. A 300-token
          // budget can be fully consumed by reasoning, leaving the visible text
          // field empty. 1024 gives ample room for both reasoning and output.
          maxOutputTokens: 1024,
          // Disable thinking for this short-output use case: the bio/roast
          // prompts are deterministic enough that chain-of-thought reasoning
          // adds latency and token cost without improving the result quality.
          thinkingConfig: { thinkingBudget: 0 },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY,
        },
      }
    )

    const candidate = response.data?.candidates?.[0]
    const text = candidate?.content?.parts?.[0]?.text as string | undefined
    const finishReason = candidate?.finishReason as string | undefined

    // If the model stopped because it hit the token limit, treat it as a failure
    // regardless of whether partial text exists, to avoid returning truncated output.
    if (finishReason === 'MAX_TOKENS') {
      return res.status(500).json({
        text: null,
        error: 'AI response was truncated because it reached the maximum token limit. Please try again.',
      })
    }

    if (!text) {
      return res.status(500).json({ text: null, error: 'AI did not return a response' })
    }

    return res.status(200).json({ text: text.trim() })
  } catch (err: unknown) {
    const error = err as AxiosError
    const status = error.response?.status
    if (status === 429) {
      return res.status(429).json({ text: null, error: 'AI quota reached for now — try again in a minute' })
    }
    if (status === 503) {
      return res.status(503).json({ text: null, error: 'AI service is temporarily overloaded — try again in a moment' })
    }
    return res.status(500).json({ text: null, error: 'Failed to generate AI insight' })
  }
}