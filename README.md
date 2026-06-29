![Would You Survive?](/public/banner-readme.png)

<div align="center">

# Would You Survive?

An AI-powered survival quiz where you answer 5 questions across deadly scenarios and Gemini narrates your inevitable fate.

[![Astro](https://img.shields.io/badge/Astro-7.x-FF5D01?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Gemini](https://img.shields.io/badge/Gemini_AI-2.5_Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js->=22-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com)

[Overview](#overview) · [Demo](#demo) · [Getting Started](#getting-started) · [How It Works](#how-it-works) · [Adding Scenarios](#adding-scenarios) · [Resources](#resources)

</div>

## Overview

**Would You Survive?** is a full-stack interactive web app built with Astro, React, and Gemini AI. Players pick a fictional scenario Zombie Apocalypse, Hogwarts, Game of Thrones, or Forbidden Love - then answer 5 strategic questions. A server-side endpoint rolls the dice (0.01% survival rate), and Gemini narrates their fate with dark humor.

The outcome is always predetermined. Gemini doesn't decide if you live or die — it just writes the story of how you went.

- **4 scenarios**, each with 5 questions and 4 options
- **Server-rendered** via Astro + Vercel adapter (`output: 'server'`)
- **AI narration** via Gemini API with structured JSON output
- **Typewriter animation** revealing your verdict character by character
- **View Transition** between the loading screen and the result — a 💀 skull mask is painted onto a `<canvas>` at runtime and set as a CSS custom property (`--vt-mask-url`), enabling a custom skull-shaped reveal animation (progressive enhancement — falls back gracefully on unsupported browsers)
- **Rate limiter** protecting the free API quota (5 req/min per IP)
- **Model fallback** chain (`gemini-2.5-flash` → `gemini-3.5-flash`)
- **Dark UI** with radio-style option buttons and progress bar

> [!NOTE]
> The AI does not decide your fate. It only narrates it. The survival roll happens server-side before the prompt is even built, ensuring the 99.99% death rate is always respected.

## Demo

| Scenario selection | Quiz question | Your verdict |
|:---:|:---:|:---:|
| ![Scenario selection](./public/screenshots/01-scenario-selection.png) | ![Quiz question](./public/screenshots/02-quiz-question.png) | ![Death verdict](./public/screenshots/03-result-death.png) |

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

## How It Works

The app uses the **Astro Islands** architecture. The page shell is static HTML; the React quiz component hydrates separately with `client:load`.

When a player finishes the quiz, the React component sends a `POST` to `/api/predict`. That endpoint:

1. Checks the IP against an in-memory rate limiter
2. Validates the request body (`scenario` + `answers`)
3. Rolls `Math.random()` — 0.01% survival chance
4. Builds a prompt telling Gemini the **predetermined outcome**
5. Calls Gemini, parses and validates the JSON response
6. Enforces `result.survived` to always match the server's roll
7. Returns the verdict with a typewriter animation

> [!TIP]
> See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full data flow diagram, [`PROJECT.md`](./PROJECT.md) for the API contract and component props, and [`TUTORIAL.md`](./TUTORIAL.md) for a step-by-step guide to building this project from scratch.

> [!NOTE]
> The free Gemini tier allows ~10 requests per minute. The app protects your quota with a sliding window rate limiter (5 requests per 60 seconds per IP). If you hit the limit, the app shows a themed error screen. To adjust the limits, edit `WINDOW_MS` and `MAX_REQUESTS` at the top of `src/pages/api/predict.ts`.

### Project structure

```
src/
├── components/
│   ├── Calabera.astro                     # Reusable skull icon wrapper (size + color via CSS)
│   ├── Calabera.jsx                       # Skull SVG icon (React)
│   ├── Fenix.jsx                          # Phoenix SVG icon (React, in progress)
│   ├── SurvivalQuiz.jsx                   # React state machine + all UI
│   └── SurvivalQuizIsland.astro           # Static image map + client:load wiring
├── constants/scenes.ts                    # Scenario and question data
├── layouts/Layout.astro                   # HTML shell
├── pages/
│   ├── index.astro                        # Entry point — includes SurvivalQuizIsland
│   └── api/predict.ts                     # POST /api/predict — SSR Gemini endpoint
└── styles/global.css                      # Tailwind + custom keyframes
public/
├── endings/                               # Scenario images served as static assets
│   ├── zombie-apocalypse.webp
│   ├── hogwarts.webp
│   ├── forbidden-love.webp
│   └── game-of-thrones.webp
├── favicon.svg
└── screenshots/
```

## Adding Scenarios

Open `src/constants/scenes.ts` and add a new key to the `SCENARIOS` object. No other files need to change.

```ts
export const SCENARIOS = {
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

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server at `http://localhost:4321` |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview the production build locally |
| `pnpm format` | Format all files with Prettier |

## Deploying to Vercel

The project is pre-configured with `@astrojs/vercel` and `output: 'server'`. Every route is server-rendered at request time.

```bash
pnpm build
vercel deploy
```

Add `GEMINI_API_KEY` as an environment variable in the Vercel project dashboard before deploying.

> [!TIP]
> The `vercel` CLI picks up `astro.config.mjs` automatically. No additional `vercel.json` configuration is needed for basic deployments.

## Resources

- [`TUTORIAL.md`](./TUTORIAL.md) — Step-by-step guide explaining every design decision
- [`PROJECT.md`](./PROJECT.md) — Full technical reference: API contract, component props, architecture
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Data flow diagrams and user journey
- [Report a bug](https://github.com/LuiccianDev/survival-quiz-astro/issues)
- [Repository](https://github.com/LuiccianDev/survival-quiz-astro)

---

<div align="center">

Built with [Astro](https://astro.build) · [React](https://react.dev) · [Tailwind CSS](https://tailwindcss.com) · [Gemini AI](https://ai.google.dev)

</div>
