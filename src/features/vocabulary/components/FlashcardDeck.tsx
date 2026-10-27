'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import EnglishAudioButton from './EnglishAudioButton'

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
  const [reviewedIds, setReviewedIds] = useState<number[]>([])
  const dueWords = words.filter(w => (w.isDue || w.isNew) && !reviewedIds.includes(w.id))
  const [deck, setDeck] = useState<WordCard[]>([])

  const [phase, setPhase] = useState<Phase>('ready')
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [rated, setRated] = useState(false)
  const [sessionResults, setSessionResults] = useState<{ again: number; hard: number; good: number; easy: number }>({
    again: 0, hard: 0, good: 0, easy: 0,
  })

  const inFlight = useRef(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [needsLogin, setNeedsLogin] = useState(false)
  const [pendingQuality, setPendingQuality] = useState<number | null>(null)
  const current = deck[idx]

  function startReview() {
    if (!dueWords.length) return
    setDeck(dueWords)
    setSaveError(null)
    setNeedsLogin(false)
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
    if (inFlight.current || rated || !current) return
    inFlight.current = true
    setRated(true)
    setSaveError(null)
    setPendingQuality(quality)

    try {
      const response = await fetch('/api/srs-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordId: current.id, quality }),
      })
      if (!response.ok) {
        setSaveError(response.status === 401
          ? 'Tu sesión venció. Iniciá sesión para guardar este repaso.'
          : 'No se pudo guardar el repaso. La tarjeta sigue pendiente.')
        setNeedsLogin(response.status === 401)
        setRated(false)
        return
      }
      const result = await response.json()
      if (result.ok !== true) throw new Error('Unconfirmed SRS save')
      const key = quality === 0 ? 'again' : quality === 1 ? 'hard' : quality === 2 ? 'good' : 'easy'
      setSessionResults(prev => ({ ...prev, [key]: prev[key] + 1 }))
      setReviewedIds(prev => [...prev, current.id])

      if (idx >= deck.length - 1) {
        setPhase('done')
      } else {
        setIdx(i => i + 1)
        setFlipped(false)
        setRated(false)
      }
    } catch {
      setSaveError('No se pudo guardar el repaso. Revisá tu conexión y reintentá.')
      setRated(false)
    } finally {
      inFlight.current = false
    }
  }

  // ── READY ──────────────────────────────────────────────────────────
  if (phase === 'ready') {
    const dueCount  = dueWords.filter(w => w.isDue).length
    const newCount  = dueWords.filter(w => w.isNew).length
    const scheduledCount = words.filter(w => (!w.isNew && !w.isDue) || reviewedIds.includes(w.id)).length

    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 gap-8 max-w-lg mx-auto w-full">
        <div className="text-center">
          <div className="text-5xl mb-3">🃏</div>
          <h2 className="text-xl font-bold text-white">Tu mazo de hoy</h2>
          <p className="text-white/40 text-sm mt-1">Repasá las palabras nuevas y las que ya cumplieron su intervalo.</p>
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
            <span className="text-white/50">📅 Programadas</span>
            <span className="font-bold text-green-400">{scheduledCount}</span>
          </div>
          <div className="border-t border-white/10 pt-3 flex justify-between items-center text-sm">
            <span className="text-white/50">Total hoy</span>
            <span className="font-bold text-white">{dueWords.length} tarjetas</span>
          </div>
        </div>

        {dueWords.length > 0 ? (
          <button onClick={startReview} className="btn-primary w-full py-4 text-base">
            Empezar repaso →
          </button>
        ) : (
          <div className="glass-card p-5 text-center border-green-500/20 bg-green-500/5">
            <p className="text-green-300 font-semibold">{words.length ? '🎉 ¡Todo al día!' : 'Todavía no hay palabras disponibles'}</p>
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

        {/* Native button supports Enter and Space without custom keyboard handlers. */}
        <button
          type="button"
          aria-label={flipped ? `Traducción de ${current.word}` : `Revelar traducción de ${current.word}`}
          aria-expanded={flipped}
          onClick={handleFlip}
          className="glass-card p-8 flex flex-col items-center justify-center gap-3 text-center min-h-[220px] w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
        >
          <span className="text-white/40 text-xs uppercase tracking-widest">Inglés</span>
          <span lang="en" className="text-3xl font-bold text-white leading-tight">{current.word}</span>
          <span className="text-violet-400 font-mono text-base">{current.phonetic}</span>
          {current.isNew && !flipped && <span className="badge badge-green">Nueva</span>}
          {flipped ? (
            <>
              <span className="text-white/40 text-xs uppercase tracking-widest mt-3">Español</span>
              <span className="text-3xl font-bold text-violet-200 leading-tight">{current.translation}</span>
              {current.example_en && (
                <span className="space-y-1 mt-2 max-w-xs">
                  <span lang="en" className="block text-white/70 text-sm italic">{current.example_en}</span>
                  {current.example_es && <span className="block text-white/50 text-xs">{current.example_es}</span>}
                </span>
              )}
            </>
          ) : <span className="text-white/40 text-xs mt-4">Toca para revelar →</span>}
        </button>
        <EnglishAudioButton text={current.word} />

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

        {saveError && (
          <div role="alert" className="glass-card p-4 space-y-3 border-red-500/30">
            <p className="text-red-200 text-sm">{saveError}</p>
            <button type="button" onClick={() => pendingQuality !== null && handleRate(pendingQuality)} className="btn-primary">
              Reintentar guardado
            </button>
            {needsLogin && <Link href="/login?next=/vocabulary" className="btn-ghost">Iniciar sesión</Link>}
          </div>
        )}

        {rated && (
          <p className="text-center text-white/30 text-sm animate-pulse">Guardando repaso…</p>
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
            <span className="text-white/50">Recordadas (autoevaluación)</span>
            <span className={`font-bold ${pct >= 70 ? 'text-green-400' : 'text-yellow-400'}`}>{pct}%</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={() => setPhase('ready')} className="btn-ghost flex-1">Ver mazo</button>
        <a href="/vocabulary" className="btn-primary flex-1">Actualizar mazo</a>
      </div>
    </div>
  )
}
