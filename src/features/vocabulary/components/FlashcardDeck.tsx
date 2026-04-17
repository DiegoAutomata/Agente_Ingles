'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

export interface WordCard {
  id: number
  word: string
  phonetic: string
  translation: string
  example_en: string | null
  example_es: string | null
  isNew: boolean
  isDue: boolean
  interval: number
  repetitions: number
  easeFactor: number
}

interface Props {
  words: WordCard[]
}

type Phase = 'ready' | 'review' | 'done'

const RATINGS = [
  { label: '❌ De nuevo', quality: 0, cls: 'border-red-500/50 text-red-300 hover:bg-red-500/10' },
  { label: '😐 Difícil',  quality: 1, cls: 'border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/10' },
  { label: '✅ Bien',     quality: 2, cls: 'border-green-500/50 text-green-300 hover:bg-green-500/10' },
  { label: '🔥 Fácil',   quality: 3, cls: 'border-violet-500/50 text-violet-300 hover:bg-violet-500/10' },
]

export default function FlashcardDeck({ words }: Props) {
  const dueWords = words.filter(w => w.isDue || w.isNew)
  const deck = dueWords.length > 0 ? dueWords : words

  const [phase, setPhase] = useState<Phase>('ready')
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [rated, setRated] = useState(false)
  const [sessionResults, setSessionResults] = useState<{ again: number; hard: number; good: number; easy: number }>({
    again: 0, hard: 0, good: 0, easy: 0,
  })

  const current = deck[idx]

  function startReview() {
    setIdx(0)
    setFlipped(false)
    setRated(false)
    setSessionResults({ again: 0, hard: 0, good: 0, easy: 0 })
    setPhase('review')
  }

  function handleFlip() {
    if (!flipped) setFlipped(true)
  }

  async function handleRate(quality: number) {
    if (rated) return
    setRated(true)

    const key = quality === 0 ? 'again' : quality === 1 ? 'hard' : quality === 2 ? 'good' : 'easy'
    setSessionResults(prev => ({ ...prev, [key]: prev[key] + 1 }))

    try {
      await fetch('/api/srs-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId: current.id, quality }),
      })
    } catch { /* offline */ }

    setTimeout(() => {
      if (idx >= deck.length - 1) {
        setPhase('done')
      } else {
        setIdx(i => i + 1)
        setFlipped(false)
        setRated(false)
      }
    }, 350)
  }

  // ── READY ──────────────────────────────────────────────────────────
  if (phase === 'ready') {
    const dueCount  = words.filter(w => w.isDue).length
    const newCount  = words.filter(w => w.isNew).length
    const doneCount = words.filter(w => !w.isNew && !w.isDue).length

    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 gap-8 max-w-lg mx-auto w-full">
        <div className="text-center">
          <div className="text-5xl mb-3">🃏</div>
          <h2 className="text-xl font-bold text-white">Tu mazo de hoy</h2>
          <p className="text-white/40 text-sm mt-1">El algoritmo SM-2 seleccionó las palabras que más necesitás repasar.</p>
        </div>

        <div className="glass-card p-5 w-full space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/50">🔴 Por repasar</span>
            <span className="font-bold text-red-400">{dueCount}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/50">🆕 Nuevas</span>
            <span className="font-bold text-blue-400">{newCount}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/50">✅ Dominadas</span>
            <span className="font-bold text-green-400">{doneCount}</span>
          </div>
          <div className="border-t border-white/10 pt-3 flex justify-between items-center text-sm">
            <span className="text-white/50">Total hoy</span>
            <span className="font-bold text-white">{deck.length} tarjetas</span>
          </div>
        </div>

        {deck.length > 0 ? (
          <button onClick={startReview} className="btn-primary w-full py-4 text-base">
            Empezar repaso →
          </button>
        ) : (
          <div className="glass-card p-5 text-center border-green-500/20 bg-green-500/5">
            <p className="text-green-300 font-semibold">🎉 ¡Todo al día!</p>
            <p className="text-white/40 text-sm mt-1">Volvé más tarde para repasar.</p>
          </div>
        )}

        <Link href="/dashboard" className="btn-ghost text-sm">← Volver al inicio</Link>
      </div>
    )
  }

  // ── REVIEW ─────────────────────────────────────────────────────────
  if (phase === 'review') {
    const progress = (idx / deck.length) * 100

    return (
      <div className="flex flex-col flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full gap-5">
        {/* Progress */}
        <div className="flex items-center gap-3 pt-2 shrink-0">
          <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-white/35 text-xs tabular-nums shrink-0">
            {idx + 1} / {deck.length}
          </span>
        </div>

        {/* Flip card */}
        <div
          className="cursor-pointer select-none"
          style={{ perspective: '1000px' }}
          onClick={handleFlip}
        >
          <div
            style={{
              transformStyle: 'preserve-3d',
              transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              position: 'relative',
              minHeight: '220px',
            }}
          >
            {/* Front */}
            <div
              className="glass-card p-8 flex flex-col items-center justify-center gap-3 text-center"
              style={{ backfaceVisibility: 'hidden', minHeight: '220px' }}
            >
              <div className="text-white/25 text-xs uppercase tracking-widest mb-1">Inglés</div>
              <div className="text-3xl font-bold text-white leading-tight">{current.word}</div>
              <div className="text-violet-400 font-mono text-base">{current.phonetic}</div>
              {current.isNew && (
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Nueva
                </span>
              )}
              <div className="text-white/20 text-xs mt-4">Toca para revelar →</div>
            </div>

            {/* Back */}
            <div
              className="glass-card p-8 flex flex-col items-center justify-center gap-4 text-center"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                position: 'absolute',
                inset: 0,
                background: 'rgba(139, 92, 246, 0.05)',
                borderColor: 'rgba(139, 92, 246, 0.2)',
              }}
            >
              <div className="text-white/25 text-xs uppercase tracking-widest">Español</div>
              <div className="text-3xl font-bold text-violet-200 leading-tight">{current.translation}</div>
              {current.example_en && (
                <div className="space-y-1 mt-2 max-w-xs">
                  <p className="text-white/70 text-sm italic">"{current.example_en}"</p>
                  {current.example_es && (
                    <p className="text-white/35 text-xs">"{current.example_es}"</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hint when not flipped */}
        {!flipped && (
          <p className="text-center text-white/25 text-xs">Tocá la tarjeta para ver la traducción</p>
        )}

        {/* Rating buttons - appear after flip */}
        {flipped && !rated && (
          <div className="grid grid-cols-2 gap-3 slide-up">
            <p className="col-span-2 text-center text-white/40 text-xs uppercase tracking-wider">
              ¿Qué tan bien lo recordaste?
            </p>
            {RATINGS.map(r => (
              <button
                key={r.quality}
                onClick={() => handleRate(r.quality)}
                className={`py-3 px-4 rounded-xl text-sm font-medium border transition-all ${r.cls}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        {rated && (
          <p className="text-center text-white/30 text-sm animate-pulse">Siguiente tarjeta…</p>
        )}
      </div>
    )
  }

  // ── DONE ───────────────────────────────────────────────────────────
  const total = sessionResults.again + sessionResults.hard + sessionResults.good + sessionResults.easy
  const correct = sessionResults.good + sessionResults.easy
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 text-center space-y-6">
      <div className="text-5xl pop-in">{pct >= 80 ? '🧠' : pct >= 60 ? '📈' : '💪'}</div>
      <div>
        <h2 className="text-2xl font-bold text-white">¡Repaso completado!</h2>
        <p className="text-white/50 text-sm mt-1">El SM-2 actualizó tu próxima sesión</p>
      </div>

      <div className="glass-card p-6 w-full max-w-xs space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between col-span-2">
            <span className="text-white/50">De nuevo</span>
            <span className="text-red-400 font-semibold">{sessionResults.again}</span>
          </div>
          <div className="flex justify-between col-span-2">
            <span className="text-white/50">Difícil</span>
            <span className="text-yellow-400 font-semibold">{sessionResults.hard}</span>
          </div>
          <div className="flex justify-between col-span-2">
            <span className="text-white/50">Bien</span>
            <span className="text-green-400 font-semibold">{sessionResults.good}</span>
          </div>
          <div className="flex justify-between col-span-2">
            <span className="text-white/50">Fácil</span>
            <span className="text-violet-400 font-semibold">{sessionResults.easy}</span>
          </div>
        </div>
        <div className="border-t border-white/10 pt-3">
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${pct >= 70 ? 'bg-green-400' : 'bg-yellow-400'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span className="text-white/50">Retención</span>
            <span className={`font-bold ${pct >= 70 ? 'text-green-400' : 'text-yellow-400'}`}>{pct}%</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={() => setPhase('ready')} className="btn-ghost flex-1">Ver mazo</button>
        <button onClick={startReview} className="btn-primary flex-1">Repetir</button>
      </div>
    </div>
  )
}
