# Build an AI Survival Quiz with Astro, React & Gemini

> **"Would You Survive?"** — a darkly comedic quiz where players face impossible scenarios and an AI decides their fate. Spoiler: they almost always die.

In this tutorial, you'll build a fully working web app from scratch. By the end, you'll have learned how to:

- Set up an **Astro** project with React and Tailwind CSS
- Use **Astro Islands** to add interactivity without bloating your bundle
- Create **server-side API endpoints** in Astro that call the **Gemini AI API**
- Craft smart AI prompts that produce structured, predictable JSON output
- Build a custom React **typewriter effect** hook
- Protect your free API quota with an **in-memory rate limiter**

The project is deliberately built to be unfair — 99.99% of players die. That's the fun.

---

## What We're Building

A four-screen interactive quiz:

1. **Scenario selection** — pick your doom (Zombie Apocalypse, Hogwarts, Game of Thrones, Forbidden Love)
2. **5 questions** — each with 4 options, a progress bar, and radio-style buttons
3. **Loading screen** — "Your fate is being written..."
4. **Result screen** — Gemini narrates your death (or miraculous survival) with a typewriter animation

```
[Select Scenario] → [Question 1-5] → [Loading] → [Result: You Died 💀]
```

Here's what the final app looks like in action:

![Scenario selection — pick your doom](public/screenshots/01-scenario-selection.png)

*Choose from 4 deadly scenarios — each with 5 questions that decide your fate.*

![Death result — AI narrates your demise](public/screenshots/03-result-death.png)

*Gemini writes a dramatic, darkly funny story about exactly how you died.*

## Prerequisites

Before starting, make sure you have:

- **Node.js 22+** — check with `node -v`
- **pnpm** — install with `npm install -g pnpm`
- A **Gemini API key** — get one free at [Google AI Studio](https://aistudio.google.com/app/apikey)

---

## Step 0 — Project Setup

Create a new Astro project and install everything we need.

```bash
pnpm create astro@latest survival-quiz
cd survival-quiz
pnpm install
```

When the Astro setup wizard asks, choose:

- **Template:** Empty
- **TypeScript:** Yes (Strict)
- **Install dependencies:** Yes

Now add React and Tailwind:

```bash
pnpm astro add react
pnpm add -D @tailwindcss/vite tailwindcss
pnpm add @google/genai
```

Update `astro.config.mjs` to wire everything together:

```js
// astro.config.mjs
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import react from '@astrojs/react'
import vercel from '@astrojs/vercel'

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
})
```

`output: 'server'` enables fully server-rendered mode — every page and API route is rendered on the server at request time. The `@astrojs/vercel` adapter translates Astro's SSR output into Vercel serverless functions.

Create `src/styles/global.css` and import Tailwind plus a custom animation we'll use later:

```css
/* src/styles/global.css */
@import 'tailwindcss';

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
```

Create your `.env` file at the project root — **never commit this file**:

```
GEMINI_API_KEY=your_api_key_here
```

---

## Step 1 — The Scenarios (Data Layer)

All quiz content lives in a single TypeScript file. This keeps the data completely separate from the UI — if you want to add a new scenario later, you touch exactly one file.

Create `src/constants/scenes.ts`:

```ts
// src/constants/scenes.ts
export const SCENARIOS = {
  zombie: {
    label: 'Zombie Apocalypse',
    questions: [
      {
        q: 'What is your first move when the alarm sounds?',
        options: ['Hide', 'Run', 'Fight', 'Find others'],
      },
      { q: 'Your weapon of choice?', options: ['Bat', 'Axe', 'Gun', 'None'] },
      { q: 'Alone or in a group?', options: ['Alone', 'Small group', 'Large group', 'Depends'] },
      { q: 'Where do you shelter?', options: ['Mall', 'Forest', 'Underground', 'Rooftop'] },
      {
        q: 'Would you sacrifice someone to escape?',
        options: ['Yes', 'No', 'Only if necessary', 'Never'],
      },
    ],
  },
  // ... add more scenarios following the same shape
}
```

Each scenario follows this contract:

| Field       | Type       | Description                  |
| ----------- | ---------- | ---------------------------- |
| `label`     | `string`   | Display name shown in the UI |
| `questions` | `array`    | Array of 5 question objects  |
| `q`         | `string`   | The question text            |
| `options`   | `string[]` | Exactly 4 answer choices     |

Why TypeScript here? Because this object is consumed by both the React component (for rendering) and the API endpoint (for the prompt). A shared typed structure catches mistakes at build time instead of runtime.

---

## Step 2 — The Layout and Page

Astro separates **layout** (the HTML shell) from **pages** (the content). Create the layout first:

```astro
---
import '../styles/global.css'
---

<!-- src/layouts/Layout.astro --><!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <title>Would You Survive?</title>
  </head>
  <body>
    <slot />
  </body>
</html>

<style>
  html,
  body {
    margin: 0;
    width: 100%;
    height: 100%;
    background-color: #0f0f0f;
  }
</style>
```

The `<slot />` is where page content gets injected. Now create the page:

```astro
---
import Layout from '../layouts/Layout.astro'
import SurvivalQuiz from '../components/SurvivalQuiz.jsx'
---

<!-- src/pages/index.astro -->
<Layout>
  <SurvivalQuiz client:load />
</Layout>
```

Notice `client:load` on the React component. This is the **Astro Islands** pattern — the most important concept in this project.

### Understanding Astro Islands

By default, Astro renders everything to static HTML. No JavaScript reaches the browser unless you explicitly opt in. `client:load` tells Astro: _"hydrate this component on the client immediately after the page loads."_

This means:

- The page shell (HTML, CSS) loads instantly with zero JS
- The React quiz component loads its JS separately, only when needed
- Other parts of the page stay static and fast

For our quiz — which is 100% interactive — `client:load` is the right choice. For something like a header or footer, you'd use no directive at all (pure static HTML).

---

## Step 3 — The Quiz React Component

This is the heart of the app. Create `src/components/SurvivalQuiz.jsx`.

![Quiz question — 5 questions, 4 options each](public/screenshots/02-quiz-question.png)

*Each question has 4 radio-style options. Pick one and the next question appears after a brief flash of your selection.*

The component manages a **state machine** with four steps:

```
'select' → 'quiz' → 'loading' → 'result'
```

Each step renders a completely different screen. Here's the state setup:

```jsx
import { useState, useEffect } from 'react'
import { SCENARIOS } from '../constants/scenes'

export default function SurvivalQuiz() {
  const [step, setStep] = useState('select')
  const [scenario, setScenario] = useState(null)
  const [answers, setAnswers] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [result, setResult] = useState(null)
  const [hoveredScenario, setHoveredScenario] = useState(null)
  const [selectedOption, setSelectedOption] = useState(null)

  const questions = scenario ? SCENARIOS[scenario].questions : []
  // ... rendering logic below
}
```

### The OptionRow Component

The quiz options use a custom radio-button style. Notice the pattern: selected state changes both the background and the inner circle of the radio indicator.

```jsx
function OptionRow({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all duration-200',
        selected
          ? 'bg-[#2a2a2a] text-white'
          : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#242424] hover:text-white',
      ].join(' ')}
    >
      {/* The radio circle */}
      <span
        className={[
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
          selected ? 'border-white bg-white' : 'border-gray-600',
        ].join(' ')}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-[#1a1a1a]" />}
      </span>
      <span className={`text-base ${selected ? 'font-semibold text-white' : 'font-normal'}`}>
        {label}
      </span>
    </button>
  )
}
```

### Handling Answers with a Brief Delay

When a player clicks an option, we want them to see their selection highlighted before the question advances. A 300ms delay achieves this without feeling sluggish:

```jsx
function handleOptionClick(opt) {
  setSelectedOption(opt) // show it selected
  setTimeout(() => {
    answer(opt) // advance after 300ms
    setSelectedOption(null)
  }, 300)
}

function answer(option) {
  const next = [...answers, option]
  setAnswers(next)
  if (currentQ + 1 < questions.length) {
    setCurrentQ(currentQ + 1) // next question
  } else {
    submitAnswers(next) // last question — submit
  }
}
```

### The Progress Bar

A simple visual indicator built with inline styles so the width is dynamic:

```jsx
<div className="mb-8 h-1 w-full rounded-full bg-[#2a2a2a]">
  <div
    className="h-1 rounded-full bg-white transition-all duration-500"
    style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
  />
</div>
```

The `transition-all duration-500` makes the bar animate smoothly on each question advance.

---

## Step 4 — The Gemini API Endpoint

Create `src/pages/api/predict.ts`. This is a server-side endpoint — it runs on the server, never in the browser. Your API key stays safe.

The first line is critical for Astro SSR:

```ts
export const prerender = false
```

Without this, Astro would try to pre-render this endpoint at build time and discard it. `prerender = false` tells Astro: _"this route must run dynamically on every request."_

### Deciding Fate Before Calling the AI

Here's the key design decision: **we decide if the player survives before we call Gemini**. We use `Math.random()` with a brutal 0.01% survival rate, then tell the AI what already happened and ask it to narrate it.

```ts
const survivalRoll = Math.random()
const survived = survivalRoll <= 0.0001 // 0.01% chance

const prompt = `
You are a dramatic, darkly comedic narrator for a survival quiz called "Would You Survive?".

THE FATE HAS ALREADY BEEN DECIDED:
- survived: ${survived}

The player answered: ${JSON.stringify(answers)}

${
  survived
    ? `The player survived — an almost impossible outcome. Write a story that feels like a miracle.`
    : `The player has died. Write a creative, dramatic, darkly funny cause of death
     connected to their specific answers. Be theatrical. Be merciless.`
}

Reply ONLY with this JSON, no markdown:
{
  "survived": ${survived},
  "title": "short dramatic title (max 6 words)",
  "story": "2-3 vivid sentences about their fate",
  "deathCause": "one sharp sentence on exactly how they died"
}
`
```

Why this approach instead of letting the AI decide?

- **Predictability** — AI models can be inconsistent about survival rates. We guarantee 99.99% death every time.
- **Tone control** — When we tell the AI the outcome, it writes a much more committed narrative. It isn't hedging; it's narrating.
- **Safety** — We enforce `result.survived = survived` after parsing, so even if the AI ignores our instruction, the correct value always wins.

### Parsing the AI Response

AI models sometimes wrap JSON in markdown code fences (` ```json ``` `). We strip those before parsing:

````ts
function parsePredictionResult(rawText: string): PredictionResult {
  const cleanedText = rawText.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(cleanedText) as PredictionResult

  // Validate the shape before trusting it
  if (
    typeof parsed !== 'object' ||
    typeof parsed.survived !== 'boolean' ||
    typeof parsed.title !== 'string' ||
    typeof parsed.story !== 'string'
  ) {
    throw new Error('Invalid prediction payload from model.')
  }

  return parsed
}
````

Always validate AI output. Never trust that the model returned exactly what you asked for.

### Model Fallback

We try two models in order. If the first fails for any reason other than a quota error, we fall back to the second:

```ts
const MODELS = ['gemini-2.5-flash', 'gemini-3.5-flash'] as const

for (const model of MODELS) {
  try {
    const interaction = await ai.interactions.create({ model, input: prompt })
    const text = interaction.output_text?.trim() ?? ''
    if (text) {
      outputText = text
      break
    }
  } catch (err) {
    // Quota errors affect all models on the same key — stop immediately
    if ((err as { status?: number })?.status === 429) break
    // Other errors — try the next model
  }
}
```

---

## Step 5 — Rate Limiting

The Gemini free tier allows ~10 requests per minute. Without protection, a single user spamming "Try Again" could exhaust your daily quota in minutes.

We implement a **sliding window rate limiter** in memory. It tracks the timestamps of each request per IP address and rejects any request that exceeds the limit.

```ts
const WINDOW_MS = 60_000 // 1 minute window
const MAX_REQUESTS = 5 // max 5 requests per IP per minute

const ipLog = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  // Keep only timestamps within the current window
  const timestamps = (ipLog.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (timestamps.length >= MAX_REQUESTS) return true
  // Record this request
  ipLog.set(ip, [...timestamps, now])
  return false
}
```

Why a sliding window instead of a fixed window? A fixed window resets at a specific clock time, which means a user could make 5 requests at 11:59:59 and 5 more at 12:00:01 — 10 requests in 2 seconds. The sliding window prevents this by always looking at the last 60 seconds from _right now_.

We also prune stale entries every 5 minutes to prevent memory from growing indefinitely:

```ts
setInterval(() => {
  const now = Date.now()
  for (const [ip, timestamps] of ipLog.entries()) {
    const fresh = timestamps.filter((t) => now - t < WINDOW_MS)
    if (fresh.length === 0) ipLog.delete(ip)
    else ipLog.set(ip, fresh)
  }
}, 5 * 60_000)
```

In the request handler, we read the IP from the headers. Behind a proxy or CDN, the real IP is in `X-Forwarded-For`:

```ts
const ip =
  request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
  request.headers.get('cf-connecting-ip') ??
  'unknown'

if (isRateLimited(ip)) {
  return jsonResponse({ error: 'Too many requests.' }, 429)
}
```

On the frontend, we handle the 429 with a thematic message instead of a generic error:

```jsx
if (res.status === 429) {
  setResult({
    survived: false,
    title: 'Slow Down, Mortal',
    story: 'You have tempted fate too many times in a row.',
    deathCause: 'Rate limited — 5 predictions per minute max.',
  })
  setStep('result')
  return
}
```

---

## Step 6 — The Typewriter Effect

The result screen reveals text character by character, creating a dramatic effect that forces the player to actually read their fate.

We build this as a custom React hook that uses `setInterval` to append one character at a time:

```jsx
function useTypewriter(text = '', speed = 12, delay = 0) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed('')
    setDone(false)
    if (!text) return

    let i = 0
    // Optional delay before starting (lets the screen settle)
    const start = setTimeout(() => {
      const interval = setInterval(() => {
        i++
        setDisplayed(text.slice(0, i))
        if (i >= text.length) {
          clearInterval(interval)
          setDone(true)
        }
      }, speed)
      return () => clearInterval(interval)
    }, delay)

    return () => clearTimeout(start)
  }, [text, speed, delay]) // re-runs if the text changes (e.g. new game)

  return { displayed, done }
}
```

The `done` boolean is essential for sequencing. We use it to chain the animations:

1. Story starts typing immediately (200ms initial delay)
2. Death cause starts only _after_ `storyDone === true` (plus 150ms pause)
3. "Try Again" button fades in only after _all_ text is done

```jsx
function ResultScreen({ result, onReset }) {
  const { displayed: storyText, done: storyDone } = useTypewriter(result.story, 12, 200)
  const { displayed: deathText, done: deathDone } = useTypewriter(
    !result.survived ? result.deathCause : '',
    10,
    storyDone ? 150 : 99999, // 99999 = effectively "not yet"
  )

  const showButton = result.survived ? storyDone : deathDone

  return (
    // ...
    <button
      className={`transition-all duration-500 ${
        showButton ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
      }`}
    >
      Try Again
    </button>
  )
}
```

The blinking cursor is a `<span>` styled with the `blink` keyframe animation we added to `global.css`:

```jsx
{
  !storyDone && (
    <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-[blink_0.7s_step-end_infinite] bg-gray-500 align-middle" />
  )
}
```

`step-end` is important here — it makes the cursor snap between visible and invisible rather than fading, which looks like a real terminal cursor.

---

## Step 7 — Hardening Your Dependencies

You have a working app. Before you ship it, take five minutes to harden your dependency setup against supply chain attacks. This is where most Node.js projects cut corners — don't.

### The threat model

npm packages can be compromised. A maintainer's account gets phished, a malicious version is published, and every project that runs `pnpm install` in the next few hours gets hit. The attack vector is almost always the same: a `postinstall` script that runs arbitrary code the moment the package is installed.

pnpm v10+ blocks this by default. Your job is to configure it intentionally.

### The configuration file

All of this lives in `pnpm-workspace.yaml` at the project root. Create it if it doesn't exist yet:

```yaml
# pnpm-workspace.yaml
allowBuilds:
  '@google/genai': false   # pure JS/TS, no native binaries needed
  esbuild: true            # required: Vite uses it to download the correct native binary
  protobufjs: false        # transitive dep of @google/genai, no build needed
  sharp: false             # optional Astro image dep, not used in this project
blockExoticSubdeps: true
engineStrict: true
ignore-scripts: true
minimumReleaseAge: 1440
# trustPolicy: no-downgrade
```

### What each setting does

**`ignore-scripts: true`**

Disables all lifecycle scripts globally. Nothing runs on install unless you explicitly say so. This is the master switch.

**`allowBuilds`**

The explicit allowlist. For every package that actually needs a build step, you set it to `true`. For everything else — especially packages you're not sure about — you set it to `false`.

The only package in this project that needs `true` is `esbuild`. It downloads a platform-specific binary during install. Without it, Vite cannot start. Everything else — `@google/genai`, `protobufjs`, `sharp` — is pure JavaScript and needs no build step.

How do you know which packages need `true`? Run `pnpm install` without the config and see what warns you. Or run `pnpm approve-builds` — it shows you every package requesting build permissions interactively.

**`blockExoticSubdeps: true`**

Prevents transitive dependencies from coming from git repositories, GitHub shorthands (`github:user/repo`), or direct tarball URLs. Every package in your tree must come from the npm registry. This closes the door on a specific attack where a compromised package changes one of its own deps to point at a malicious git repo.

**`trustPolicy: no-downgrade`**

pnpm tracks how much cryptographic evidence a package has — provenance attestations, signed releases, verified publishers. If a new version has *less* trust than the previous one, the install is blocked. This catches compromised accounts that publish a new version without the usual signing pipeline.

**`minimumReleaseAge: 1440`**

pnpm refuses to resolve any package version published less than 24 hours ago. The vast majority of compromised packages are detected and pulled from the registry within that window. This single setting eliminates almost all zero-day supply chain exposure at zero cost to you.

**`engineStrict: true`**

Enforces your `engines.node` constraint from `package.json`. If someone tries to install with Node.js 18 on a project that requires 22+, the install fails immediately with a clear error instead of silently producing broken output.

### Verify it works

After creating the file, run `pnpm install` again. You should see no warnings about blocked scripts — which means everything that *would* have run is now either explicitly allowed or silently skipped.

If you add a new dependency in the future and it needs build permissions, pnpm will tell you. Add it to `allowBuilds` only if you understand why it needs to run a script.

---

## Step 8 — Run It

```bash
pnpm dev
```

Open `http://localhost:4321`, pick a scenario, answer the questions, and meet your fate.

---

## What to Try Next

The project is intentionally minimal so it's easy to extend. Here are some ideas:

**Add a new scenario** — open `src/constants/scenes.ts`, copy an existing scenario block, change the key, label, and questions. That's it. The UI and API pick it up automatically.

**Adjust the survival rate** — change `0.0001` in `predict.ts` to `0.01` for a 1% survival rate, or `0.5` for a coin flip. The prompt adapts automatically.

**Add scenario-specific styling** — pass the scenario key as a prop and map it to a color theme or background image.

**Persist results** — store results in `localStorage` and show a "your history" screen with your past deaths.

**Deploy to Vercel** — the project ships with `@astrojs/vercel` pre-configured and `output: 'server'` enabled. Run `pnpm build`, then `vercel deploy`. Add `GEMINI_API_KEY` as an environment variable in the Vercel project dashboard before your first deployment.

---

## Final Project Structure

```
survival-quiz/
├── src/
│   ├── components/
│   │   └── SurvivalQuiz.jsx     ← All quiz UI and state
│   ├── constants/
│   │   └── scenes.ts            ← All scenario data
│   ├── layouts/
│   │   └── Layout.astro         ← HTML shell
│   ├── pages/
│   │   ├── index.astro          ← Entry point
│   │   └── api/
│   │       └── predict.ts       ← Gemini API endpoint
│   └── styles/
│       └── global.css           ← Tailwind + animations
├── astro.config.mjs
├── .env                         ← GEMINI_API_KEY (never commit)
└── package.json
```

You built a full-stack AI web app with a server-side API, structured AI prompting, rate limiting, and polished UI animations. Not bad for one afternoon. 💀
