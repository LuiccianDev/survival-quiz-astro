import type { APIRoute } from 'astro'
import { GoogleGenAI } from '@google/genai'

export const prerender = false

const MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash'] as const

// ─── Rate limiter ────────────────────────────────────────────────────────────
// In-memory store: tracks request timestamps per IP.
// Limits each IP to MAX_REQUESTS within a WINDOW_MS sliding window.
const WINDOW_MS = 60_000 // 1 minute
const MAX_REQUESTS = 5 // max 5 predictions per IP per minute

const ipLog = new Map<string, number[]>()

/** Returns true if the IP has exceeded the rate limit. */
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = (ipLog.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (timestamps.length >= MAX_REQUESTS) return true
  ipLog.set(ip, [...timestamps, now])
  return false
}

// Prune stale entries every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now()
  for (const [ip, timestamps] of ipLog.entries()) {
    const fresh = timestamps.filter((t) => now - t < WINDOW_MS)
    if (fresh.length === 0) ipLog.delete(ip)
    else ipLog.set(ip, fresh)
  }
}, 5 * 60_000)
// ─────────────────────────────────────────────────────────────────────────────

type PredictionPayload = {
  scenario?: unknown
  answers?: unknown
}

type PredictionResult = {
  survived: boolean
  title: string
  story: string
  deathCause?: string
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function parsePredictionResult(rawText: string): PredictionResult {
  const cleanedText = rawText.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(cleanedText) as PredictionResult

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof parsed.survived !== 'boolean' ||
    typeof parsed.title !== 'string' ||
    typeof parsed.story !== 'string'
  ) {
    throw new Error('Invalid prediction payload from model.')
  }

  if (parsed.survived === false && typeof parsed.deathCause !== 'string') {
    throw new Error('Missing deathCause for a failed run.')
  }

  return parsed
}

export const POST: APIRoute = async ({ request }) => {
  // Rate limit check — uses X-Forwarded-For (proxied) or direct connection IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('cf-connecting-ip') ??
    'unknown'

  if (isRateLimited(ip)) {
    return jsonResponse(
      { error: 'Too many requests. Take a breath — you only get 5 predictions per minute.' },
      429,
    )
  }

  const rawBody = await request.text()

  if (!rawBody.trim()) {
    return jsonResponse({ error: 'Request body is required.' }, 400)
  }

  let payload: PredictionPayload

  try {
    payload = JSON.parse(rawBody) as PredictionPayload
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400)
  }

  const { scenario, answers } = payload

  if (
    typeof scenario !== 'string' ||
    !scenario.trim() ||
    !isStringArray(answers) ||
    answers.length === 0
  ) {
    return jsonResponse({ error: 'Invalid scenario or answers payload.' }, 400)
  }

  const apiKey = import.meta.env.GEMINI_API_KEY

  if (!apiKey) {
    return jsonResponse({ error: 'Missing GEMINI_API_KEY environment variable.' }, 500)
  }

  const ai = new GoogleGenAI({ apiKey })

  const survivalRoll = Math.random()
  const survived = survivalRoll <= 0.0001 // 0.01% chance of survival

  const prompt = `
You are a dramatic, darkly comedic narrator for a survival quiz game called "Would You Survive?".
Your job is to judge the player's fate in the scenario "${scenario}" based on their answers.

THE FATE HAS ALREADY BEEN DECIDED BY THE GODS OF PROBABILITY:
- survived: ${survived}

The player answered: ${JSON.stringify(answers)}

Your task is to write a vivid, immersive verdict that matches this predetermined fate.

${
  survived
    ? `The player is one of the legendary 0.01% who actually survived. This is an extraordinary, almost impossible outcome.
     Write a story that acknowledges how incredibly close they came to death at every turn, yet somehow — against all odds — they made it.
     Make it feel like a miracle, not a comfortable win. They should feel lucky to be alive.`
    : `The player has died. This is their inevitable fate (as it is for 99.99% of all players).
     Write a creative, dramatic, and darkly funny cause of death that fits the scenario.
     The death should feel poetic and connected to their specific answers — punish their worst decisions.
     Be theatrical. Be merciless. Be entertaining.`
}

Reply ONLY with this JSON, no markdown, no explanation:
{
  "survived": ${survived},
  "title": "short dramatic title (max 6 words)",
  "story": "2-3 vivid sentences about their fate, matching the survived value above",
  "deathCause": "${survived ? '' : 'required: one sharp sentence on exactly how and why they died'}"
}
  `

  let outputText = ''
  let lastError: unknown

  for (const model of MODELS) {
    try {
      const interaction = await ai.interactions.create({ model, input: prompt })
      const text = interaction.output_text?.trim() ?? ''
      if (text) {
        outputText = text
        break
      }
    } catch (err) {
      console.warn(`Model ${model} failed, trying next...`, err)
      lastError = err
    }
  }

  if (!outputText) {
    return jsonResponse({ error: 'All models failed.', detail: String(lastError) }, 502)
  }

  try {
    const result = parsePredictionResult(outputText)
    // Enforce our predetermined fate — never let the model override it
    result.survived = survived
    if (survived) result.deathCause = ''
    return jsonResponse(result)
  } catch {
    return jsonResponse({ error: 'Model returned an invalid JSON response.', raw: outputText }, 502)
  }
}
