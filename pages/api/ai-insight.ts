import type { NextApiRequest, NextApiResponse } from 'next'
import axios, { type AxiosError } from 'axios'
import { getClientIp, createRateLimiter } from '@/lib/rateLimit'
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
  // Optional parameters to support Phase 2 UI customization
  tone?: 'Professional' | 'Casual' | 'Tech-Heavy'
  length?: 'Short' | 'Detailed'
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
    // Dynamic instructions based on potential frontend toggles
    const toneInstruction = body.tone ? `Tone: ${body.tone}.` : 'Tone: Confident, engaging, and professional.'
    const lengthInstruction = body.length === 'Detailed' 
      ? 'Write a rich, detailed 4-6 sentence paragraph' 
      : 'Write 3-4 impactful sentences'

    return `You are an expert tech recruiter and developer advocate writing a highly personalized bio for a developer's GitHub README. Based on the data below, ${lengthInstruction.toLowerCase()} that captures the true depth of their profile.

Crucial Instructions:
- Explicitly name their most impressive or highly-starred repositories from the list.
- Analyze their top languages to highlight specific frameworks or tech stacks they likely use.
- Call out their contribution patterns (e.g., impressive streaks, massive yearly contributions, or interesting weekday/weekend habits).
- ${toneInstruction}
- Do NOT invent facts or repositories that aren't supported by the data below. Don't pad with generic filler.

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
// bounded internally so it cannot grow without limit.
const RATE_LIMIT_WINDOW_MS = 60000
const RATE_LIMIT_MAX = 10

const rateLimiter = createRateLimiter(RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX)

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
  const retryAfter = rateLimiter.check(clientIp)
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
