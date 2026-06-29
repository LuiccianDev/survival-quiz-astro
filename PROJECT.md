# Would You Survive? — Project Reference

A technical reference for the "Would You Survive?" project. Use this document to understand the architecture, data contracts, and configuration of every moving part.

---

## Overview

"Would You Survive?" is a server-rendered web application built with Astro. Players select a fictional scenario, answer 5 strategic questions, and receive an AI-generated verdict on their survival. The outcome is predetermined by a probability roll (0.01% survival rate) server-side; the Gemini AI only narrates the result.

---

## Tech Stack

| Tool | Version | Role |
|------|---------|------|
| Astro | ^7.0.3 | Framework — routing, SSR, Islands architecture |
| React | ^19.2.7 | Interactive UI components (quiz state machine) |
| Tailwind CSS | 4.3.1 | Utility-first styling |
| `@google/genai` | 2.10.0 | Gemini AI SDK |
| TypeScript | (via Astro) | Type safety for shared data contracts |
| pnpm | — | Package manager |
| Node.js | >=22.12.0 | Runtime |

---

## Project Structure

```
survival-quiz/
├── src/
│   ├── components/
│   │   └── SurvivalQuiz.jsx     # React quiz component (client-side island)
│   ├── constants/
│   │   └── scenes.ts            # All scenario and question data
│   ├── layouts/
│   │   └── Layout.astro         # HTML document shell
│   ├── pages/
│   │   ├── index.astro          # Application entry point
│   │   └── api/
│   │       └── predict.ts       # POST /api/predict — Gemini SSR endpoint
│   └── styles/
│       └── global.css           # Tailwind import + custom keyframes
├── .env                         # Environment variables (not committed)
├── astro.config.mjs             # Astro + Vite + Tailwind configuration
├── package.json
└── tsconfig.json
```

---

## Architecture

### Data Flow

```
Browser
  │
  ├─ GET /          → index.astro renders Layout + SurvivalQuiz (static shell)
  │                   client:load hydrates SurvivalQuiz as a React island
  │
  └─ POST /api/predict
       │
       ├─ Rate limiter checks IP (in-memory sliding window)
       ├─ Validates request body (scenario: string, answers: string[])
       ├─ Math.random() decides survival (0.01% chance)
       ├─ Builds prompt with predetermined fate
       ├─ Calls Gemini API (gemini-2.5-flash → gemini-3.5-flash fallback)
       ├─ Parses + validates JSON response
       ├─ Enforces result.survived = our value (never the AI's)
       └─ Returns PredictionResult JSON
```

### Astro Islands

`SurvivalQuiz` is rendered as an **Astro Island** with `client:load`. The rest of the page (layout, head, body shell) is static HTML with no JavaScript. This means:

- The document appears instantly — no JS blocking paint
- React hydrates the quiz component after the page loads
- The component runs entirely in the browser; the API endpoint runs entirely on the server

The separation is enforced by the framework: `.astro` files run at build time or on the server. `.jsx` files with `client:*` directives run in the browser.

### State Machine

`SurvivalQuiz` uses a linear state machine controlled by a `step` string:

```
'select' ──→ 'quiz' ──→ 'loading' ──→ 'result'
                                          │
                              reset() ────┘ (returns to 'select')
```

Each step renders a completely different screen. There is no component tree branching — each `if (step === '...')` block returns its own full layout.

---

## Scenarios Reference (`src/constants/scenes.ts`)

### SCENARIOS Object Schema

```ts
type Scenario = {
  label: string         // Display name in the UI
  questions: Question[] // Must contain exactly 5 questions
}

type Question = {
  q: string       // Question text
  options: string[] // Must contain exactly 4 answer options
}

const SCENARIOS: Record<string, Scenario>
```

### Available Scenarios

| Key | Label | Theme |
|-----|-------|-------|
| `zombie` | Zombie Apocalypse | Survival horror |
| `hogwarts` | Hogwarts | Fantasy |
| `doomed_love` | Forbidden Love | Tragic romance |
| `got` | Game of Thrones | Political fantasy |

### Adding a New Scenario

Add a new key to the `SCENARIOS` object in `src/constants/scenes.ts`. No other files need to change — the UI and API consume `SCENARIOS` dynamically.

```ts
export const SCENARIOS = {
  // ... existing scenarios ...

  my_scenario: {
    label: 'My New Scenario',
    questions: [
      { q: 'Question 1?', options: ['A', 'B', 'C', 'D'] },
      { q: 'Question 2?', options: ['A', 'B', 'C', 'D'] },
      { q: 'Question 3?', options: ['A', 'B', 'C', 'D'] },
      { q: 'Question 4?', options: ['A', 'B', 'C', 'D'] },
      { q: 'Question 5?', options: ['A', 'B', 'C', 'D'] },
    ],
  },
}
```

---

## API Endpoint Reference

### `POST /api/predict`

Evaluates a completed quiz and returns an AI-generated survival verdict.

**File:** `src/pages/api/predict.ts`
**SSR:** `export const prerender = false`

#### Request

```
Content-Type: application/json
```

```ts
{
  scenario: string   // Key from SCENARIOS (e.g. "zombie")
  answers: string[]  // Array of 5 selected option strings
}
```

#### Response — Success (`200`)

```ts
{
  survived: boolean      // Always reflects the server's Math.random() roll
  title: string          // Short dramatic title (max 6 words)
  story: string          // 2-3 sentence narrative
  deathCause?: string    // Present when survived === false
}
```

#### Response — Errors

| Status | Condition |
|--------|-----------|
| `400` | Missing body, invalid JSON, or missing/invalid `scenario` or `answers` |
| `429` | IP rate limit exceeded (5 req/min) or Gemini quota exceeded |
| `500` | `GEMINI_API_KEY` environment variable not set |
| `502` | All Gemini models failed to return a valid response |

---

## Rate Limiter

**Location:** `src/pages/api/predict.ts` (module-level, persists for the process lifetime)

| Parameter | Value | Description |
|-----------|-------|-------------|
| `WINDOW_MS` | `60_000` | Sliding window duration in milliseconds (1 minute) |
| `MAX_REQUESTS` | `5` | Maximum requests per IP within the window |
| Cleanup interval | `300_000` | Stale entries are pruned every 5 minutes |

**IP detection order:**
1. `X-Forwarded-For` header (first entry, for proxied/CDN traffic)
2. `CF-Connecting-IP` header (Cloudflare)
3. Falls back to `"unknown"` if neither header is present

**Note:** This is an in-memory store. It resets on every server restart and is not shared across multiple server instances. It is appropriate for single-instance deployments on the free Gemini tier.

---

## Gemini Integration

### Model Fallback Chain

```
gemini-2.5-flash  →  gemini-3.5-flash
```

The loop iterates in order. On success, it breaks. On a `429` (quota error), it breaks immediately — quota errors affect the API key, not the specific model. On other errors, it tries the next model.

### Survival Probability

```ts
const survivalRoll = Math.random()       // 0.0 – 1.0
const survived = survivalRoll <= 0.0001  // true ~0.01% of the time
```

To change the survival rate, update the threshold:

| Threshold | Approximate survival rate |
|-----------|--------------------------|
| `0.0001`  | 0.01% (current — nearly always die) |
| `0.01`    | 1% |
| `0.1`     | 10% |
| `0.5`     | 50% (coin flip) |

### Prompt Strategy

The prompt communicates the predetermined outcome to the model and instructs it to narrate accordingly. After receiving the response, the server enforces the correct `survived` value regardless of what the model returned:

```ts
result.survived = survived       // override AI output
if (survived) result.deathCause = ''
```

---

## Component Reference

### `SurvivalQuiz` (default export)

**File:** `src/components/SurvivalQuiz.jsx`

The main component. Manages all quiz state and renders the correct screen based on `step`.

**State:**

| Variable | Type | Description |
|----------|------|-------------|
| `step` | `'select' \| 'quiz' \| 'loading' \| 'result'` | Current screen |
| `scenario` | `string \| null` | Selected scenario key |
| `answers` | `string[]` | Collected answers so far |
| `currentQ` | `number` | Index of the current question (0–4) |
| `result` | `PredictionResult \| null` | API response |
| `hoveredScenario` | `string \| null` | For hover styling on scenario list |
| `selectedOption` | `string \| null` | Briefly set on click before advancing |

### `ResultScreen`

**Props:** `{ result: PredictionResult, onReset: () => void }`

Renders the verdict with typewriter animations. Uses `useTypewriter` twice — once for `story`, once for `deathCause`. The "Try Again" button is always in the DOM but invisible until typing completes (prevents layout shift on reveal).

### `useTypewriter(text, speed, delay)`

**Type:** Custom React Hook

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `text` | `string` | `''` | Full text to reveal |
| `speed` | `number` | `22` | Milliseconds per character |
| `delay` | `number` | `0` | Milliseconds before typing starts |

**Returns:** `{ displayed: string, done: boolean }`

Resets and restarts whenever `text` changes.

### `OptionRow`

**Props:** `{ label: string, selected: boolean, onClick: () => void }`

A radio-style button row. Renders a filled circle when `selected`, an outlined circle otherwise.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google AI Studio API key. Used server-side only in `predict.ts`. Never exposed to the browser. |

---

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server at `http://localhost:4321` |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview the production build locally |
| `pnpm format` | Format all files with Prettier |
