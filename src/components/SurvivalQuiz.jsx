import { useState } from 'react'
import { SCENARIOS } from '../constants/scenes'

/** Radio-style option row — matches the dark-UI reference design */
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
      {/* Radio circle */}
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

export default function SurvivalQuiz() {
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
    // Short delay so the user sees the selection before advancing
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
          <h1 className="mb-2 text-4xl font-bold leading-tight tracking-tight text-white">
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
          {/* Progress */}
          <p className="mb-6 text-sm font-medium tracking-widest text-gray-500 uppercase">
            Question {currentQ + 1} of {questions.length}
          </p>

          {/* Progress bar */}
          <div className="mb-8 h-1 w-full rounded-full bg-[#2a2a2a]">
            <div
              className="h-1 rounded-full bg-white transition-all duration-500"
              style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
            />
          </div>

          <h2 className="mb-3 text-3xl font-bold leading-tight text-white">
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
          <div className="text-5xl animate-bounce">💀</div>
          <h2 className="text-2xl font-bold text-white">Your fate is being written...</h2>
          <p className="text-sm text-gray-500 animate-pulse">The universe is not on your side</p>
          {/* Pulsing dots */}
          <div className="flex gap-2 mt-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-full bg-white/40 animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )

  /* ─── RESULT ─── */
  if (step === 'result')
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f0f0f] px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mb-6 text-7xl">{result.survived ? '🏆' : '💀'}</div>

          <h2 className="mb-3 text-3xl font-bold leading-tight text-white">{result.title}</h2>
          <Divider />
          <div className="mx-auto mt-1 mb-1 h-px w-full bg-[#2a2a2a]" />

          <p className="mt-6 mb-4 text-base leading-relaxed text-gray-400">{result.story}</p>

          {!result.survived && (
            <div className="mt-4 rounded-2xl bg-[#1a1a1a] px-5 py-4 text-left">
              <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-1">
                Cause of death
              </p>
              <p className="text-sm font-medium text-red-400">{result.deathCause}</p>
            </div>
          )}

          <button
            onClick={reset}
            className="mt-8 w-full rounded-2xl bg-white px-8 py-4 text-base font-semibold text-black transition-all duration-200 hover:bg-gray-100 active:scale-95"
          >
            Try Again
          </button>
        </div>
      </div>
    )
}
