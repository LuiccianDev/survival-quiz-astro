# Architecture & Flow

Visual diagrams of how "Would You Survive?" works end to end.

---

## Application Flow

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

---

## API Endpoint Lifecycle

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

---

## Astro Islands Architecture

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

> The project uses `output: 'server'` with the `@astrojs/vercel` adapter. Every route is server-rendered on each request — there is no static pre-rendering. The HTML shell and routing run on the Vercel edge/serverless runtime. The quiz UI runs in the browser. The API endpoint runs on the server. They share no runtime — only data contracts.

---

## State Machine

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

---

## Rate Limiter — Sliding Window

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

---

## Survival Probability Decision

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
