import type { APIRoute } from 'astro'
import { GoogleGenAI } from '@google/genai'

export const prerender = false

const MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash'] as const

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

  const prompt = `
    Scenario: ${scenario}
    User answers: ${JSON.stringify(answers)}

    Decide if the user survives. Reply ONLY with this JSON, no markdown:
    {
      "survived": true or false,
      "title": "short dramatic title",
      "story": "2-3 sentences about their fate",
      "deathCause": "if survived=false, how exactly they died (dramatic/funny), else empty string"
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
    return jsonResponse(
      { error: 'All models failed.', detail: String(lastError) },
      502,
    )
  }

  try {
    const result = parsePredictionResult(outputText)
    return jsonResponse(result)
  } catch {
    return jsonResponse(
      { error: 'Model returned an invalid JSON response.', raw: outputText },
      502,
    )
  }
}