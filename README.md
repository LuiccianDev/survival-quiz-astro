![Would You Survive?](/public/banner-readme.png)
<div align="center">

An AI-powered survival quiz where you answer 5 questions across deadly scenarios and an AI narrates your inevitable fate.

[![Astro](https://img.shields.io/badge/Astro-7.x-FF5D01?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Gemini](https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js->=22-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

[Overview](#overview) · [Getting Started](#getting-started) · [Project Structure](#project-structure) · [How It Works](#how-it-works) · [Adding Scenarios](#adding-a-scenario) · [Security](#security) · [Documentation](#documentation)

</div>

---

## Overview

**Would You Survive?** is a full-stack interactive web app built with Astro, React, and the Gemini AI API. Players pick a fictional scenario — Zombie Apocalypse, Hogwarts, Game of Thrones, Forbidden Love — then answer 5 strategic questions. A server-side endpoint rolls the dice (0.01% survival rate), and Gemini narrates their fate with dark humor.

The outcome is always predetermined. Gemini doesn't decide if you live or die — it just writes the story of how you went.

**Key features:**

- 4 built-in scenarios, each with 5 questions and 4 options
- Fully server-rendered via the Vercel adapter (`output: 'server'`)
- Server-side AI narration via the Gemini API (structured JSON output)
- Typewriter animation revealing your verdict character by character
- In-memory sliding window rate limiter protecting the free API quota
- Model fallback chain (`gemini-2.5-flash` → `gemini-3.5-flash`)
- Dark UI with radio-style option buttons and progress bar

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) >= 22.12.0
- [pnpm](https://pnpm.io) — `npm install -g pnpm`
- A [Gemini API key](https://aistudio.google.com/app/apikey) (free tier works)

### Installation

```bash
git clone https://github.com/LuiccianDev/survival-quiz-astro.git
cd survival-quiz-astro
pnpm install
```

### Configuration

Create a `.env` file at the project root:

```bash
GEMINI_API_KEY=your_api_key_here
```

> [!WARNING]
> Never commit your `.env` file. It is already listed in `.gitignore`. Your API key runs server-side only and is never exposed to the browser.

### Run

```bash
pnpm dev
```

Open [http://localhost:4321](http://localhost:4321).

---

## Project Structure

```
survival-quiz/
├── src/
│   ├── components/
│   │   └── SurvivalQuiz.jsx     # React quiz — state machine + all UI
│   ├── constants/
│   │   └── scenes.ts            # All scenario and question data
│   ├── layouts/
│   │   └── Layout.astro         # HTML shell
│   ├── pages/
│   │   ├── index.astro          # Entry point — mounts the React island
│   │   └── api/
│   │       └── predict.ts       # POST /api/predict — SSR Gemini endpoint
│   └── styles/
│       └── global.css           # Tailwind + custom keyframes
├── .env                         # API key (not committed)
├── astro.config.mjs
└── package.json
```

---

## How It Works

The app uses the **Astro Islands** architecture. The page shell is static HTML with zero JavaScript. The React quiz component hydrates separately with `client:load`, keeping the initial load fast.

When a player finishes the quiz, the React component sends a `POST` to `/api/predict`. That Astro SSR endpoint:

1. Checks the IP against an in-memory rate limiter (5 req/min per IP)
2. Validates the request body (`scenario` + `answers`)
3. Rolls `Math.random()` — survival chance is 0.01%
4. Builds a prompt that tells Gemini the **predetermined outcome** and asks it to narrate
5. Calls Gemini, parses and validates the JSON response
6. Enforces `result.survived` to always match the server's roll — the AI never overrides fate
7. Returns the verdict

The result screen uses a custom `useTypewriter` hook to reveal the story and cause of death character by character, with the "Try Again" button fading in only after all text finishes.

> [!NOTE]
> The AI does not decide your fate. It only narrates it. The survival roll happens server-side before the prompt is even built, ensuring the 99.99% death rate is always respected.

---

## Adding a Scenario

Open `src/constants/scenes.ts` and add a new key to the `SCENARIOS` object. No other files need to change.

```ts
export const SCENARIOS = {
  // existing scenarios...

  your_scenario: {
    label: 'Your Scenario Name',
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

Each scenario requires exactly **5 questions** with exactly **4 options** each.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server at `http://localhost:4321` |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview the production build locally |
| `pnpm format` | Format all files with Prettier |

---

## Deploying to Vercel

The project is pre-configured with `@astrojs/vercel` and `output: 'server'`. Every route is server-rendered at request time.

```bash
pnpm build
vercel deploy
```

Add `GEMINI_API_KEY` as an environment variable in the Vercel project dashboard before deploying. The key is used exclusively server-side and is never bundled into client assets.

> [!TIP]
> The `vercel` CLI picks up `astro.config.mjs` automatically. No additional `vercel.json` configuration is needed for basic deployments.

---

## Security

The project applies multiple layers of supply chain protection via `pnpm-workspace.yaml`, on top of the application-level rate limiter described below.

| Layer | Setting | What it does |
|-------|---------|--------------|
| Build script allowlist | `allowBuilds` | Only `esbuild` may run postinstall scripts. All other deps — including `@google/genai`, `protobufjs`, and `sharp` — are explicitly blocked. |
| Exotic source blocking | `blockExoticSubdeps: true` | Prevents transitive dependencies from being resolved from git repos or direct tarball URLs instead of the npm registry. |
| Trust policy | `trustPolicy: no-downgrade` | Blocks a package version if its trust level has decreased compared to previous releases (e.g., dropped provenance or signature). |
| Publication delay | `minimumReleaseAge: 1440` | Refuses to install any package version published less than 24 hours ago — most malware is detected within that window. |
| Script isolation | `ignore-scripts: true` | Disables lifecycle scripts globally; only packages explicitly listed in `allowBuilds` can execute build scripts. |

> [!NOTE]
> These settings protect the development environment and CI pipeline. They do not affect the runtime behavior of the deployed application.

---

## Rate Limits

The free Gemini tier allows ~10 requests per minute. The app protects your quota with a built-in rate limiter:

| Setting | Value |
|---------|-------|
| Window | 60 seconds (sliding) |
| Max requests per IP | 5 per window |
| Cleanup interval | Every 5 minutes |

If you hit the limit, the app shows a themed error screen instead of a generic failure. To adjust the limits, edit `WINDOW_MS` and `MAX_REQUESTS` at the top of `src/pages/api/predict.ts`.

> [!TIP]
> The free Gemini tier resets daily at midnight Pacific Time. If you exhaust your daily quota (RPD) during development, wait until the next day or upgrade to a paid plan.

---

## Documentation

- [`TUTORIAL.md`](./TUTORIAL.md) — Step-by-step guide to building this project from scratch, explaining every design decision
- [`PROJECT.md`](./PROJECT.md) — Full technical reference: API contract, component props, architecture diagrams, and configuration

---

<div align="center">

Built with [Astro](https://astro.build) · [React](https://react.dev) · [Tailwind CSS](https://tailwindcss.com) · [Gemini AI](https://ai.google.dev)

</div>
