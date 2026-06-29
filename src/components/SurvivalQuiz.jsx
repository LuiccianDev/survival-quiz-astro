import { useState, useEffect } from 'react'
import { SCENARIOS } from '../constants/scenes'
import Calabera from './Calabera.jsx'
import Fenix from './Fenix.jsx'

/** Typewriter hook — reveals text character by character */
function useTypewriter(text = '', speed = 22, delay = 0) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed('')
    setDone(false)
    if (!text) return

    let i = 0
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
  }, [text, speed, delay])

  return { displayed, done }
}

/** Radio-style option row */
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

/** Thin accent divider */
function Divider() {
  return <div className="h-px w-16 bg-white/60" />
}

/** Result screen with typewriter effect */
function ResultScreen({ result, scenario, sceneImages, onReset }) {
  const { displayed: storyText, done: storyDone } = useTypewriter(result.story ?? '', 12, 200)
  const { displayed: deathText, done: deathDone } = useTypewriter(
    !result.survived ? (result.deathCause ?? '') : '',
    10,
    storyDone ? 150 : 99999,
  )

  const showButton = result.survived ? storyDone : deathDone
  const sceneImage = sceneImages?.[scenario]

  return (
    <div className="flex min-h-screen flex-col bg-[#0f0f0f] md:h-screen md:flex-row">
      {/* Image panel — full height on desktop, fixed height on mobile */}
      <div className="relative h-64 shrink-0 overflow-hidden md:h-full md:w-1/2">
        {sceneImage && (
          <>
            <img
              src={sceneImage}
              alt={scenario ?? ''}
              className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-106"
              loading="eager"
              decoding="async"
            />
            {/* Vignette: bottom fade on mobile, right fade on desktop */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-[#0f0f0f]" />
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 md:w-1/2 md:px-10">
        <div className="w-full max-w-md">
          {/* Icon + title */}
          <div className="mb-4 flex items-center gap-3">
            <span className="text-4xl">{result.survived ? <Fenix className="inline-block text-amber-400" width={40} height={40} /> : <Calabera className="inline-block text-white" width={40} height={40} />}</span>
            <h2 className="text-2xl leading-tight font-bold text-white">{result.title}</h2>
          </div>

          <div className="mb-5 h-px w-full bg-[#2a2a2a]" />

          {/* Story */}
          <p className="min-h-[4rem] text-sm leading-relaxed text-gray-400">
            {storyText}
            {!storyDone && (
              <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-[blink_0.7s_step-end_infinite] bg-gray-500 align-middle" />
            )}
          </p>

          {/* Death cause */}
          {!result.survived && (
            <div
              className={`mt-4 rounded-xl bg-[#1a1a1a] px-4 py-3 transition-opacity duration-300 ${storyDone ? 'opacity-100' : 'opacity-0'}`}
            >
              <p className="mb-1 text-xs font-semibold tracking-widest text-gray-600 uppercase">
                Cause of death
              </p>
              <p className="text-sm text-red-400">
                {deathText}
                {storyDone && !deathDone && (
                  <span className="ml-0.5 inline-block h-3 w-0.5 animate-[blink_0.7s_step-end_infinite] bg-red-400 align-middle" />
                )}
              </p>
            </div>
          )}

          {/* Button fades in when done */}
          <button
            onClick={onReset}
            className={`mt-6 w-full rounded-2xl bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all duration-500 hover:bg-gray-100 active:scale-95 ${showButton ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SurvivalQuiz({ sceneImages = {} }) {
  const [step, setStep] = useState('select') // select | quiz | loading | result
  const [scenario, setScenario] = useState(null)
  const [answers, setAnswers] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [result, setResult] = useState(null)
  const [hoveredScenario, setHoveredScenario] = useState(null)
  const [selectedOption, setSelectedOption] = useState(null)

  const questions = scenario ? SCENARIOS[scenario].questions : []

  function selectScenario(key) {
    setScenario(key)
    setAnswers([])
    setCurrentQ(0)
    setSelectedOption(null)
    setStep('quiz')
  }

  function handleOptionClick(opt) {
    setSelectedOption(opt)
    setTimeout(() => {
      answer(opt)
      setSelectedOption(null)
    }, 300)
  }

  function answer(option) {
    const next = [...answers, option]
    setAnswers(next)
    if (currentQ + 1 < questions.length) {
      setCurrentQ(currentQ + 1)
    } else {
      submitAnswers(next)
    }
  }

  async function submitAnswers(finalAnswers) {
    setStep('loading')
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, answers: finalAnswers }),
      })
      const data = await res.json()
      if (res.status === 429) {
        setResult({
          survived: false,
          title: 'Slow Down, Mortal',
          story:
            'You have tempted fate too many times in a row. Even death needs a break from you.',
          deathCause: 'Rate limited — 5 predictions per minute max. Try again shortly.',
        })
        setStep('result')
        return
      }
      if (!res.ok) throw new Error(data?.error || 'Prediction request failed.')
      setResult(data)
      setStep('result')
    } catch {
      setResult({
        survived: false,
        title: 'Connection Lost',
        story: 'Something went wrong connecting to the void.',
        deathCause: 'API error — the universe itself rejected you.',
      })
      setStep('result')
    }
  }

  function reset() {
    setStep('select')
    setScenario(null)
    setAnswers([])
    setCurrentQ(0)
    setResult(null)
    setSelectedOption(null)
    setHoveredScenario(null)
  }

  /* ─── SCENARIO SELECTION ─── */
  if (step === 'select')
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f0f] px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="mb-2 text-4xl leading-tight font-bold tracking-tight text-white">
            Would You Survive?
          </h1>
          <Divider />
          <p className="mt-6 mb-8 text-base text-gray-400">
            Choose your scenario and face your fate.
          </p>
          <div className="flex flex-col gap-3">
            {Object.entries(SCENARIOS).map(([key, val]) => (
              <button
                key={key}
                onClick={() => selectScenario(key)}
                onMouseEnter={() => setHoveredScenario(key)}
                onMouseLeave={() => setHoveredScenario(null)}
                className={[
                  'flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all duration-200',
                  hoveredScenario === key
                    ? 'bg-[#2a2a2a] text-white'
                    : 'bg-[#1a1a1a] text-gray-400',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
                    hoveredScenario === key ? 'border-white' : 'border-gray-600',
                  ].join(' ')}
                />
                <span
                  className={`text-base ${hoveredScenario === key ? 'font-semibold text-white' : 'font-normal'}`}
                >
                  {val.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )

  /* ─── QUIZ ─── */
  if (step === 'quiz')
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f0f] px-6 py-12">
        <div className="w-full max-w-md">
          <p className="mb-6 text-sm font-medium tracking-widest text-gray-500 uppercase">
            Question {currentQ + 1} of {questions.length}
          </p>
          <div className="mb-8 h-1 w-full rounded-full bg-[#2a2a2a]">
            <div
              className="h-1 rounded-full bg-white transition-all duration-500"
              style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
            />
          </div>
          <h2 className="mb-3 text-3xl leading-tight font-bold text-white">
            {questions[currentQ].q}
          </h2>
          <Divider />
          <p className="mt-4 mb-8 text-sm text-gray-500">Choose wisely. Your life depends on it.</p>
          <div className="flex flex-col gap-3">
            {questions[currentQ].options.map((opt) => (
              <OptionRow
                key={opt}
                label={opt}
                selected={selectedOption === opt}
                onClick={() => handleOptionClick(opt)}
              />
            ))}
          </div>
        </div>
      </div>
    )

  /* ─── LOADING ─── */
  if (step === 'loading')
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0f0f0f] px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Calabera className="animate-bounce text-white" width={56} height={56} />
          <h2 className="text-2xl font-bold text-white">Your fate is being written...</h2>
          <p className="animate-pulse text-sm text-gray-500">The universe is not on your side</p>
          <div className="mt-2 flex gap-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 animate-pulse rounded-full bg-white/40"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )

  /* ─── RESULT ─── */
  if (step === 'result') return <ResultScreen result={result} scenario={scenario} sceneImages={sceneImages} onReset={reset} />
}
