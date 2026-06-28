import { useState } from 'react';

const SCENARIOS = {
  zombie: {
    label: '🧟 Zombie Apocalypse',
    questions: [
      { q: 'What is your first move when the alarm sounds?', options: ['Hide', 'Run', 'Fight', 'Find others'] },
      { q: 'Your weapon of choice?', options: ['Bat', 'Axe', 'Gun', 'None'] },
      { q: 'Alone or in a group?', options: ['Alone', 'Small group', 'Large group', 'Depends'] },
      { q: 'Where do you shelter?', options: ['Mall', 'Forest', 'Underground', 'Rooftop'] },
      { q: 'Would you sacrifice someone to escape?', options: ['Yes', 'No', 'Only if necessary', 'Never'] },
    ],
  },
  hogwarts: {
    label: '⚡ Hogwarts',
    questions: [
      { q: 'Your Hogwarts house?', options: ['Gryffindor', 'Slytherin', 'Hufflepuff', 'Ravenclaw'] },
      { q: 'First spell you master?', options: ['Expelliarmus', 'Avada Kedavra', 'Lumos', 'Accio'] },
      { q: 'Facing Voldemort, you...?', options: ['Fight', 'Run', 'Negotiate', 'Hide'] },
      { q: 'Your magical creature companion?', options: ['Owl', 'Phoenix', 'Dragon', 'None'] },
      { q: 'Dark Arts: use them or refuse?', options: ['Use them', 'Refuse always', 'Only in emergencies', 'Learn but never use'] },
    ],
  },
  got: {
    label: '🐉 Game of Thrones',
    questions: [
      { q: 'Your house allegiance?', options: ['Stark', 'Lannister', 'Targaryen', 'No one'] },
      { q: 'Strategy for survival?', options: ['Betrayal', 'Loyalty', 'Isolation', 'Gold'] },
      { q: 'Winter is coming. You...?', options: ['Stockpile', 'Migrate south', 'Ignore it', 'Prepare army'] },
      { q: 'The throne is yours to take. How?', options: ['War', 'Marriage', 'Politics', 'Dragons'] },
      { q: 'A trusted ally betrays you. You...?', options: ['Execute them', 'Forgive', 'Exile', 'Use it against them'] },
    ],
  },
};

export default function SurvivalQuiz() {
  const [step, setStep] = useState('select'); // select | quiz | loading | result
  const [scenario, setScenario] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState(null);

  const questions = scenario ? SCENARIOS[scenario].questions : [];

  function selectScenario(key) {
    setScenario(key);
    setAnswers([]);
    setCurrentQ(0);
    setStep('quiz');
  }

  function answer(option) {
    const next = [...answers, option];
    setAnswers(next);
    if (currentQ + 1 < questions.length) {
      setCurrentQ(currentQ + 1);
    } else {
      submitAnswers(next);
    }
  }

  async function submitAnswers(finalAnswers) {
    setStep('loading');
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario, answers: finalAnswers }),
      });
      const data = await res.json();
      setResult(data);
      setStep('result');
    } catch {
      setResult({ survived: false, title: 'Connection Lost', story: 'Something went wrong.', deathCause: 'API error.' });
      setStep('result');
    }
  }

  function reset() {
    setStep('select');
    setScenario(null);
    setAnswers([]);
    setCurrentQ(0);
    setResult(null);
  }

  if (step === 'select') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">Would You Survive?</h1>
      <p className="text-gray-500">Pick a scenario and find out your fate.</p>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {Object.entries(SCENARIOS).map(([key, val]) => (
          <button key={key} onClick={() => selectScenario(key)}
            className="py-3 px-6 rounded-xl border-2 border-black font-semibold hover:bg-black hover:text-white transition-all">
            {val.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (step === 'quiz') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <p className="text-sm text-gray-400">Question {currentQ + 1} of {questions.length}</p>
      <h2 className="text-2xl font-bold text-center max-w-md">{questions[currentQ].q}</h2>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {questions[currentQ].options.map((opt) => (
          <button key={opt} onClick={() => answer(opt)}
            className="py-3 px-6 rounded-xl border-2 border-black font-semibold hover:bg-black hover:text-white transition-all">
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  if (step === 'loading') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-xl font-semibold animate-pulse">Gemini is deciding your fate...</p>
    </div>
  );

  if (step === 'result') return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-6xl">{result.survived ? '🏆' : '💀'}</div>
      <h2 className="text-3xl font-bold">{result.title}</h2>
      <p className="max-w-md text-gray-600">{result.story}</p>
      {!result.survived && (
        <p className="max-w-md text-red-500 font-medium">Cause of death: {result.deathCause}</p>
      )}
      <button onClick={reset}
        className="mt-4 py-3 px-8 rounded-xl bg-black text-white font-semibold hover:bg-gray-800 transition-all">
        Try Again
      </button>
    </div>
  );
}