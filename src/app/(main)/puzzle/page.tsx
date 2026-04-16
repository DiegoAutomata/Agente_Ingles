'use client'

import { useState, useCallback } from 'react'

interface Word {
  word: string
  translation: string
  phonetic: string
}

const WORD_BANK: Word[] = [
  { word: 'come', translation: 'venir', phonetic: '(cám)' },
  { word: 'give', translation: 'dar', phonetic: '(guív)' },
  { word: 'take', translation: 'tomar', phonetic: '(téik)' },
  { word: 'make', translation: 'hacer', phonetic: '(méik)' },
  { word: 'keep', translation: 'mantener', phonetic: '(kíip)' },
  { word: 'send', translation: 'enviar', phonetic: '(sénd)' },
  { word: 'seem', translation: 'parecer', phonetic: '(síim)' },
  { word: 'have', translation: 'tener', phonetic: '(jáv)' },
  { word: 'work', translation: 'trabajar', phonetic: '(uérk)' },
  { word: 'help', translation: 'ayudar', phonetic: '(jelp)' },
  { word: 'know', translation: 'saber', phonetic: '(nóU)' },
  { word: 'good', translation: 'bueno', phonetic: '(gúd)' },
  { word: 'time', translation: 'tiempo', phonetic: '(táim)' },
  { word: 'also', translation: 'también', phonetic: '(ólso)' },
  { word: 'very', translation: 'muy', phonetic: '(véri)' },
  { word: 'only', translation: 'solo', phonetic: '(ónli)' },
]

function shuffle(str: string): string {
  const arr = str.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.join('') === str && str.length > 1 ? shuffle(str) : arr.join('')
}

function pickRandom(): Word {
  return WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]
}

type Status = 'playing' | 'correct' | 'wrong'

export default function PuzzlePage() {
  const [current, setCurrent] = useState<Word>(() => pickRandom())
  const [scrambled, setScrambled] = useState<string>(() => {
    const w = pickRandom()
    return shuffle(w.word)
  })
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<Status>('playing')
  const [score, setScore] = useState(0)
  const [total, setTotal] = useState(0)

  const loadNext = useCallback(() => {
    const next = pickRandom()
    setCurrent(next)
    setScrambled(shuffle(next.word))
    setInput('')
    setStatus('playing')
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status !== 'playing') return
    const isCorrect = input.trim().toLowerCase() === current.word.toLowerCase()
    setStatus(isCorrect ? 'correct' : 'wrong')
    setTotal(t => t + 1)
    if (isCorrect) setScore(s => s + 1)
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">🧩 Puzzles</h1>
        <span className="badge badge-purple">{score}/{total} correctas</span>
      </div>

      <div className="glass-card p-6 space-y-6 text-center">
        <p className="text-white/50 text-sm">Ordena las letras para formar la palabra en inglés</p>

        {/* Traducción pista */}
        <div>
          <p className="text-white/40 text-xs mb-1">Significa:</p>
          <p className="text-2xl font-bold text-white">{current.translation}</p>
          <p className="text-white/40 text-sm mt-1">{current.phonetic}</p>
        </div>

        {/* Letras mezcladas */}
        <div className="flex justify-center gap-2 flex-wrap">
          {scrambled.split('').map((letter, i) => (
            <span
              key={i}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 font-bold text-lg uppercase"
            >
              {letter}
            </span>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={status !== 'playing'}
            placeholder="Escribe la palabra..."
            className="input-field flex-1 text-center uppercase"
            autoComplete="off"
            autoFocus
          />
          {status === 'playing' && (
            <button type="submit" className="btn-primary px-4">OK</button>
          )}
        </form>

        {/* Feedback */}
        {status === 'correct' && (
          <div className="space-y-3">
            <p className="text-green-400 font-bold text-lg">✅ ¡Correcto!</p>
            <button onClick={loadNext} className="btn-primary">Siguiente →</button>
          </div>
        )}
        {status === 'wrong' && (
          <div className="space-y-3">
            <p className="text-red-400 font-bold">❌ Era: <span className="text-white uppercase">{current.word}</span></p>
            <button onClick={loadNext} className="btn-ghost">Siguiente →</button>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="glass-card p-4 flex items-center justify-between">
          <span className="text-white/60 text-sm">Precisión</span>
          <span className="font-bold text-violet-300">
            {Math.round((score / total) * 100)}%
          </span>
        </div>
      )}
    </div>
  )
}
