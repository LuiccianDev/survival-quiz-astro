# Architecture & Flow

How "Would You Survive?" works end to end — the data flow, the decision chain, and why the pieces fit together the way they do.

---

## User Journey

The app is a linear quiz with four screens. Each screen is a different state in the React component. The user flows through them in order, and the loop closes when they hit "Try Again".

```mermaid
flowchart TD
    A([User opens the app]) --> B[index.astro\nserves static HTML shell]
    B --> C[React island hydrates\nvia client:load]
    C --> D{step = 'select'}

    D --> E[User picks a scenario\ne.g. Zombie Apocalypse]
    E --> F{step = 'quiz'}

    F --> G[Question 1 of 5\nOptionRow components]
    G --> H[User selects an answer\n300ms visual feedback]
    H --> I{More questions?}
    I -- Yes --> G
    I -- No --> J{step = 'loading'}

    J --> K[POST /api/predict\nscenario + answers]
    K --> L{step = 'result'}

    L --> M[ResultScreen\ntypewriter animation]
    M --> N{User clicks\nTry Again?}
    N -- Yes --> D
```

**Why this matters:** The entire UI is a state machine with four states (`select → quiz → loading → result`). There's no routing library, no URL params — just a single `step` string. This keeps the component simple and the logic predictable. Each render returns a completely different screen, so there's no stale state leaking between screens.

---

## Astro Islands — Server + Browser Separation

The page shell is pure HTML. No JavaScript reaches the browser until the React quiz component explicitly asks to hydrate. This is the **Astro Islands** pattern.

```mermaid
flowchart LR
    subgraph Server["Server (Vercel / Node.js)"]
        A[Layout.astro\nHTML shell]
        B[index.astro\nentry point]
        C[predict.ts\nSSR endpoint]
    end

    subgraph Browser["Browser"]
        D[Static HTML\nno JS]
        E[SurvivalQuiz.jsx\nReact island\nclient:load]
    end

    B -- renders --> A
    A -- slot → --> D
    B -- hydrates --> E
    E -- fetch POST --> C
    C -- JSON --> E
```

**Why this matters:** Astro renders the HTML on the server and sends zero JavaScript by default. Only the interactive quiz component — marked with `client:load` — gets hydrated on the client. The API endpoint (`predict.ts`) never leaves the server. This separation means:
- The page appears instantly (no JS blocking paint)
- The Gemini API key stays server-side forever
- The React bundle is the only JS the browser downloads

The project uses `output: 'server'` with the `@astrojs/vercel` adapter. Every route is server-rendered on each request — nothing is pre-rendered at build time.

---

## State Machine — Component Lifecycle

The React component uses four states. Each one maps to a distinct visual screen, and transitions are triggered by user actions or API responses.

```mermaid
stateDiagram-v2
    [*] --> select : app loads

    select --> quiz : user picks scenario
    quiz --> quiz : answer question (currentQ++)
    quiz --> loading : last answer submitted
    loading --> result : API responds
    loading --> result : API error / rate limit

    result --> select : user clicks Try Again

    note right of loading
        POST /api/predict
        Gemini narrates fate
    end note

    note right of result
        Typewriter reveals:
        1. story
        2. deathCause (if dead)
        3. Try Again button
    end note
```

**Why this matters:** The state machine is the backbone of the component. By keeping transitions explicit and linear, we avoid the complexity of nested conditional rendering. The loading state is especially important — it prevents double-submits and gives the user visual feedback while Gemini processes (which takes 2–5 seconds).

---

## API Call — How Fate Is Decided

This is the most important architectural decision in the project. **The server decides if the player survives before it calls Gemini.** The AI only narrates the outcome — it never decides it.

```mermaid
sequenceDiagram
    actor User
    participant React as SurvivalQuiz.jsx
    participant API as POST /api/predict
    participant Gemini as Gemini AI

    User->>React: Submits last answer
    React->>React: setStep('loading')
    React->>API: POST { scenario, answers }

    API->>API: Extract IP from headers
    API->>API: Check rate limiter (5 req/min)

    alt Rate limit exceeded
        API-->>React: 429 Too Many Requests
        React->>React: Show "Slow Down, Mortal" screen
    else Within limit
        API->>API: Validate body schema
        API->>API: Math.random() → survived (0.01% chance)
        API->>API: Build prompt with predetermined fate
        API->>Gemini: interactions.create({ model, input: prompt })

        alt Gemini succeeds
            Gemini-->>API: JSON { survived, title, story, deathCause }
            API->>API: Parse + validate response
            API->>API: Enforce result.survived = our roll
            API-->>React: 200 PredictionResult
            React->>React: setStep('result')
        else Gemini quota error (429)
            Gemini-->>API: RateLimitError
            API->>API: Break — do not retry
            API-->>React: 429 Quota exceeded
        else Gemini model error
            Gemini-->>API: Error
            API->>API: Try next model in fallback chain
            API->>Gemini: interactions.create({ model: fallback })
            Gemini-->>API: JSON response
            API-->>React: 200 PredictionResult
        end
    end
```

**Why this matters:** Letting the AI decide would give inconsistent survival rates. AI models don't follow probability instructions reliably. By rolling `Math.random()` first (99.99% death rate) and baking the outcome into the prompt, we guarantee consistency. The server also overrides `result.survived` after parsing — even if the AI ignores the instruction, the correct value wins.

The endpoint has two fallback layers:
1. **Model fallback:** If `gemini-2.5-flash` fails (except quota errors), try `gemini-3.5-flash`
2. **Rate limiter:** A sliding window prevents one user from exhausting the daily API quota in minutes

---

## Rate Limiter — Sliding Window

The free Gemini tier allows ~10 requests per minute. Without protection, a single user spamming "Try Again" could burn through it. The rate limiter uses a sliding window (not a fixed clock window) to prevent burst abuse.

```mermaid
flowchart TD
    A[Incoming request] --> B[Read IP from headers\nX-Forwarded-For → CF-Connecting-IP → unknown]
    B --> C[Load timestamps for this IP\nfrom ipLog Map]
    C --> D[Filter: keep only timestamps\nwithin last 60 seconds]
    D --> E{Count >= 5?}

    E -- Yes --> F[Return 429\nToo Many Requests]
    E -- No --> G[Append current timestamp\nto the list]
    G --> H[Save back to ipLog]
    H --> I[Continue to handler]

    subgraph cleanup["Cleanup — every 5 minutes"]
        J[For each IP in ipLog] --> K{Any fresh timestamps?}
        K -- No --> L[Delete IP entry]
        K -- Yes --> M[Update with fresh timestamps only]
    end
```

**Why sliding window instead of fixed?** A fixed window resets at a specific clock boundary (e.g., every minute on the minute). A user could send 5 requests at 11:59:59 and 5 more at 12:00:01 — 10 requests in 2 seconds. The sliding window always looks at the last 60 seconds from right now, so this burst isn't possible.

---

## Survival Probability

The survival roll happens before the AI prompt is built. The threshold is intentionally brutal — 0.01% survival rate.

```mermaid
flowchart LR
    A[Math.random\n0.0 to 1.0] --> B{value <= 0.0001?}
    B -- Yes\n0.01% chance --> C[survived = true]
    B -- No\n99.99% chance --> D[survived = false]

    C --> E[Prompt: narrate\na miracle survival]
    D --> F[Prompt: narrate\na creative death]

    E --> G[Gemini writes story]
    F --> G

    G --> H[Server enforces\nresult.survived = our value]
    H --> I[Return to client]
```

**Why this matters:** The prompt tells Gemini the outcome and asks it to narrate — not decide. This produces better writing because the AI commits to the story instead of hedging. The server enforces the final `survived` value regardless of what the model returned, so the 99.99% rule is absolute.
