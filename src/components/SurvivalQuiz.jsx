import { useState } from 'react'
import { SCENARIOS } from '../constants/scenes'

export default function SurvivalQuiz() {
  const [step, setStep] = useState('select') // select | quiz | loading | result
  const [scenario, setScenario] = useState(null)
  const [answers, setAnswers] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [result, setResult] = useState(null)

  const questions = scenario ? SCENARIOS[scenario].questions : []

  function selectScenario(key) {
    setScenario(key)
    setAnswers([])
    setCurrentQ(0)
    setStep('quiz')
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

      if (!res.ok) {
        throw new Error(data?.error || 'Prediction request failed.')
      }

      setResult(data)
      setStep('result')
    } catch {
      setResult({
        survived: false,
        title: 'Connection Lost',
        story: 'Something went wrong.',
        deathCause: 'API error.',
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
  }

  if (step === 'select')
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-4xl font-bold">Would You Survive?</h1>
        <p className="text-gray-500">Pick a scenario and find out your fate.</p>
        <div className="flex w-full max-w-sm flex-col gap-3">
          {Object.entries(SCENARIOS).map(([key, val]) => (
            <button
              key={key}
              onClick={() => selectScenario(key)}
              className="rounded-xl border-2 border-black px-6 py-3 font-semibold transition-all hover:bg-black hover:text-white"
            >
              {val.label}
            </button>
          ))}
        </div>
      </div>
    )

  if (step === 'quiz')
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <p className="text-sm text-gray-400">
          Question {currentQ + 1} of {questions.length}
        </p>
        <h2 className="max-w-md text-center text-2xl font-bold">{questions[currentQ].q}</h2>
        <div className="flex w-full max-w-sm flex-col gap-3">
          {questions[currentQ].options.map((opt) => (
            <button
              key={opt}
              onClick={() => answer(opt)}
              className="rounded-xl border-2 border-black px-6 py-3 font-semibold transition-all hover:bg-black hover:text-white"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    )

  if (step === 'loading')
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="animate-pulse text-xl font-semibold">Gemini is deciding your fate...</p>
      </div>
    )

  if (step === 'result')
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="text-6xl">{result.survived ? '🏆' : '💀'}</div>
        <h2 className="text-3xl font-bold">{result.title}</h2>
        <p className="max-w-md text-gray-600">{result.story}</p>
        {!result.survived && (
          <p className="max-w-md font-medium text-red-500">Cause of death: {result.deathCause}</p>
        )}
        <button
          onClick={reset}
          className="mt-4 rounded-xl bg-black px-8 py-3 font-semibold text-white transition-all hover:bg-gray-800"
        >
          Try Again
        </button>
      </div>
    )
}
