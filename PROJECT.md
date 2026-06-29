# Would You Survive? — Project Reference

A technical reference for the "Would You Survive?" project. Use this document to understand the architecture, data contracts, and configuration of every moving part.

---

## Overview

"Would You Survive?" is a server-rendered web application built with Astro. Players select a fictional scenario, answer 5 strategic questions, and receive an AI-generated verdict on their survival. The outcome is predetermined by a probability roll (0.01% survival rate) server-side; the Gemini AI only narrates the result.

---

## Tech Stack

| Tool              | Version     | Role                                                               |
| ----------------- | ----------- | ------------------------------------------------------------------ |
| Astro             | ^7.0.3      | Framework — routing, SSR, Islands architecture                     |
| `@astrojs/vercel` | latest      | Astro adapter — compiles SSR output to Vercel serverless functions |
| React             | ^19.2.7     | Interactive UI components (quiz state machine)                     |
| Tailwind CSS      | 4.3.1       | Utility-first styling                                              |
| `@google/genai`   | 2.10.0      | Gemini AI SDK                                                      |
| TypeScript        | (via Astro) | Type safety for shared data contracts                              |
| pnpm              | —           | Package manager                                                    |
| Node.js           | >=22.12.0   | Runtime                                                            |

---

## Project Structure

```
survival-quiz/
├── src/
│   ├── assets/
│   │   └── endings/                   # Scenario images (webp) — processed by getImage
│   ├── components/
│   │   ├── Calabera.jsx               # Skull SVG icon (death result, loading screen)
│   │   ├── Fenix.jsx                  # Phoenix SVG icon (survival result)
│   │   ├── SurvivalQuiz.jsx           # React quiz component (client-side island)
│   │   └── SurvivalQuizIsland.astro   # Astro wrapper — runs image pipeline + mounts React island
│   ├── constants/
│   │   └── scenes.ts                  # All scenario and question data
│   ├── layouts/
│   │   └── Layout.astro               # HTML document shell
│   ├── pages/
│   │   ├── index.astro                # Entry point — includes SurvivalQuizIsland
│   │   └── api/
│   │       └── predict.ts             # POST /api/predict — Gemini SSR endpoint
│   └── styles/
│       └── global.css                 # Tailwind @theme + per-scenario accent colors + keyframes
├── .env                               # GEMINI_API_KEY (not committed)
├── .env.example                       # Key name without value (for contributors)
├── astro.config.mjs                   # Astro + Vite + Tailwind + Vercel adapter configuration
├── package.json
├── pnpm-workspace.yaml                # Supply chain security hardening
└── tsconfig.json
```

---

## Architecture

### Data Flow

```
Browser
  │
  ├─ GET /          → index.astro includes SurvivalQuizIsland.astro
  │                   SurvivalQuizIsland.astro runs getImage × 4 (Astro image pipeline)
  │                   Passes sceneImages prop to SurvivalQuiz
  │                   Renders Layout + SurvivalQuizIsland (static shell)
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

### Astro SSR Configuration

The project uses `output: 'server'` mode with the `@astrojs/vercel` adapter (`astro.config.mjs`). This means:

- Every page and API route is server-rendered on each request — nothing is pre-rendered at build time.
- The `@astrojs/vercel` adapter compiles Astro's SSR output into Vercel serverless functions.
- `export const prerender = false` on `predict.ts` is still correct but technically redundant in full `server` mode — it documents intent and ensures the endpoint stays dynamic if the output mode is ever changed to `hybrid`.

### Astro Islands

`SurvivalQuiz` is rendered as an **Astro Island** with `client:load`. The image pipeline and island wiring are encapsulated in `SurvivalQuizIsland.astro` — an Astro component that runs `getImage` for all four scenario images at request time, assembles the `sceneImages` map, and mounts `SurvivalQuiz` with `client:load`. `index.astro` simply includes this component, keeping the entry point minimal.

The rest of the page (layout, head, body shell) is rendered server-side on every request. This means:

- The document appears instantly — no JS blocking paint
- React hydrates the quiz component after the page loads
- Image URLs are correctly hashed and optimised at request time without touching the React bundle
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

## Data Contracts

Shared types used across the React component and the API endpoint.

### PredictionResult

Returned by `POST /api/predict` and consumed by `ResultScreen`.

```ts
interface PredictionResult {
  survived: boolean // Always matches the server's Math.random() roll
  title: string // Short dramatic title (max 6 words)
  story: string // 2-3 sentence narrative from Gemini
  deathCause?: string // Present only when survived === false
}
```

### PredictionRequest

Sent from `SurvivalQuiz.jsx` to `/api/predict`.

```ts
interface PredictionRequest {
  scenario: string // Key from SCENARIOS (e.g. "zombie")
  answers: string[] // Array of 5 selected option strings
}
```

### SCENARIOS Record

Defined in `src/constants/scenes.ts`. Each key maps to a scenario object.

```ts
type Scenario = {
  label: string // Display name shown in the UI
  questions: Question[] // Exactly 5 questions
}

type Question = {
  q: string // The question text
  options: string[] // Exactly 4 answer choices
}

const SCENARIOS: Record<string, Scenario>
```

---

## Scenarios Reference (`src/constants/scenes.ts`)

The `SCENARIOS` record is the single source of truth for all quiz content. Every scenario follows the contract defined in [Data Contracts](#data-contracts).

### Available Scenarios

| Key           | Label             | Accent Color | Theme             |
| ------------- | ----------------- | ------------ | ----------------- |
| `zombie`      | Zombie Apocalypse | `#c5d5b8`    | Survival horror   |
| `hogwarts`    | Hogwarts          | `#c4c9e8`    | Fantasy           |
| `doomed_love` | Forbidden Love    | `#e8c4cd`    | Tragic romance    |
| `got`         | Game of Thrones   | `#e8dcc4`    | Political fantasy |

The accent color is assigned via CSS in `global.css` using the `data-scenario` attribute and the `--accent` custom property. The React component sets `data-scenario={scenario}` on the root quiz div, and every element using `var(--accent)` shifts color accordingly.

### Adding a New Scenario

Add a new key to the `SCENARIOS` object in `src/constants/scenes.ts`. Then add a `data-scenario` CSS rule with an accent color. No other files need to change — the UI and API consume `SCENARIOS` dynamically.

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

```css
/* src/styles/global.css */
[data-scenario='my_scenario'] {
  --accent: #your-color;
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

| Status | Condition                                                              |
| ------ | ---------------------------------------------------------------------- |
| `400`  | Missing body, invalid JSON, or missing/invalid `scenario` or `answers` |
| `429`  | IP rate limit exceeded (5 req/min) or Gemini quota exceeded            |
| `500`  | `GEMINI_API_KEY` environment variable not set                          |
| `502`  | All Gemini models failed to return a valid response                    |

---

## Rate Limiter

**Location:** `src/pages/api/predict.ts` (module-level, persists for the process lifetime)

| Parameter        | Value     | Description                                        |
| ---------------- | --------- | -------------------------------------------------- |
| `WINDOW_MS`      | `60_000`  | Sliding window duration in milliseconds (1 minute) |
| `MAX_REQUESTS`   | `5`       | Maximum requests per IP within the window          |
| Cleanup interval | `300_000` | Stale entries are pruned every 5 minutes           |

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
const survivalRoll = Math.random() // 0.0 – 1.0
const survived = survivalRoll <= 0.0001 // true ~0.01% of the time
```

To change the survival rate, update the threshold:

| Threshold | Approximate survival rate           |
| --------- | ----------------------------------- |
| `0.0001`  | 0.01% (current — nearly always die) |
| `0.01`    | 1%                                  |
| `0.1`     | 10%                                 |
| `0.5`     | 50% (coin flip)                     |

### Prompt Strategy

The prompt communicates the predetermined outcome to the model and instructs it to narrate accordingly. After receiving the response, the server enforces the correct `survived` value regardless of what the model returned:

```ts
result.survived = survived // override AI output
if (survived) result.deathCause = ''
```

---

## Component Reference

### `SurvivalQuiz` (default export)

**File:** `src/components/SurvivalQuiz.jsx`

The main component. Manages all quiz state and renders the correct screen based on `step`.

**Props:**

| Prop          | Type                     | Description                                                                                                                                                                        |
| ------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sceneImages` | `Record<string, string>` | Map of scenario key → optimised image URL. Built in `SurvivalQuizIsland.astro` via `getImage` and passed as a server-side prop so the component never imports raw assets directly. |

**State:**

| Variable          | Type                                          | Description                           |
| ----------------- | --------------------------------------------- | ------------------------------------- |
| `step`            | `'select' \| 'quiz' \| 'loading' \| 'result'` | Current screen                        |
| `scenario`        | `string \| null`                              | Selected scenario key                 |
| `answers`         | `string[]`                                    | Collected answers so far              |
| `currentQ`        | `number`                                      | Index of the current question (0–4)   |
| `result`          | `PredictionResult \| null`                    | API response                          |
| `hoveredScenario` | `string \| null`                              | For hover styling on scenario list    |
| `selectedOption`  | `string \| null`                              | Briefly set on click before advancing |

**Error handling:** On API errors, `submitAnswers` catches the exception and transitions to `result` with a fallback `PredictionResult` (survived = false, title "Connection Lost"). On 429 rate limit responses, it transitions to `result` with a thematic "Slow Down, Mortal" result. Both cases are indistinguishable from real AI verdicts.

### `ResultScreen`

**Props:** `{ result: PredictionResult, scenario: string | null, sceneImages: Record<string, string>, onReset: () => void }`

Renders the verdict in a horizontal split layout. The scenario image occupies the left panel (`md:w-1/2`, full height, `object-cover`) with a vignette gradient overlay. On mobile, the image collapses to a fixed `h-64` top panel and the content stacks below.

The content panel contains:

- A **SVG icon** (`Calabera.jsx` for death, `Fenix.jsx` for survival)
- The **dramatic title** in `var(--accent)` color
- The **story text** revealed via typewriter
- An optional **death cause** card (`bg-surface-800`, red text) that fades in after story typing
- A **"Try Again" button** that fades in (`opacity-0 → opacity-100` with `translate-y-2 → translate-y-0`) after all text is complete

Uses `useTypewriter` twice — once for `story`, once for `deathCause`. The "Try Again" button is always in the DOM but invisible (`opacity-0 pointer-events-none`) until typing completes, preventing layout shift on reveal.

### `useTypewriter(text, speed, delay)`

**Type:** Custom React Hook

| Parameter | Type     | Default | Description                       |
| --------- | -------- | ------- | --------------------------------- |
| `text`    | `string` | `''`    | Full text to reveal               |
| `speed`   | `number` | `22`    | Milliseconds per character        |
| `delay`   | `number` | `0`     | Milliseconds before typing starts |

**Returns:** `{ displayed: string, done: boolean }`

Resets and restarts whenever `text` changes. The `done` boolean is `true` when the full text has been revealed.

### `OptionRow`

**Props:** `{ label: string, selected: boolean, onClick: () => void }`

A radio-style button row. Renders a filled circle when `selected`, an outlined circle otherwise. Background lifts from `bg-surface-800` to `bg-surface-700` and the radio circle fills with `var(--accent)` when selected.

### `Calabera.jsx`

**File:** `src/components/Calabera.jsx`

A sugar-skull-inspired SVG icon component. Renders inline SVG with `fill="currentColor"` so color is inherited from the parent's `text-*` class.

**Props:**

| Prop        | Type     | Default | Description                             |
| ----------- | -------- | ------- | --------------------------------------- |
| `className` | `string` | `''`    | Tailwind/CSS classes for color and size |
| `width`     | `number` | `36`    | `width` attribute on the SVG element    |
| `height`    | `number` | `36`    | `height` attribute on the SVG element   |

**Usage:**

```jsx
<Calabera className="inline-block text-[var(--accent)]" width={40} height={40} />
```

### `Fenix.jsx`

**File:** `src/components/Fenix.jsx`

A phoenix SVG icon component, used on the result screen when the player survives. Uses the same prop interface as `Calabera.jsx`.

**Props:** Same as `Calabera.jsx` (`className`, `width`, `height`).

**Usage:**

```jsx
<Fenix className="inline-block text-amber-400" width={40} height={40} />
```

---

## Environment Variables

| Variable         | Required | Description                                                                                    |
| ---------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY` | Yes      | Google AI Studio API key. Used server-side only in `predict.ts`. Never exposed to the browser. |

---

## Development Commands

| Command        | Description                                         |
| -------------- | --------------------------------------------------- |
| `pnpm dev`     | Start development server at `http://localhost:4321` |
| `pnpm build`   | Build for production                                |
| `pnpm preview` | Preview the production build locally                |
| `pnpm format`  | Format all files with Prettier                      |

---

## Related Documentation

- [`TUTORIAL.md`](./TUTORIAL.md) — Step-by-step guide to building this project from scratch
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Visual diagrams and explanation of system architecture
- [`SECURITY.md`](./SECURITY.md) — Supply chain security configuration reference
