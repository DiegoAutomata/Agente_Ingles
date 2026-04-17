'use client'

import { useState } from 'react'
import Link from 'next/link'
import { VERBS, DRILLS, type VerbDrill } from '../data/verbs'

type Phase = 'gallery' | 'drill' | 'done'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function VerbArena() {
  const [phase, setPhase] = useState<Phase>('gallery')
  const [flipped, setFlipped] = useState<Set<string>>(new Set())
  const [drills, setDrills] = useState<VerbDrill[]>(() => shuffle(DRILLS))
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  const current = drills[idx]
  const verbInfo = VERBS.find(v => v.base === current?.verbBase)

  function toggleFlip(base: string) {
    setFlipped(prev => {
      const next = new Set(prev)
      next.has(base) ? next.delete(base) : next.add(base)
      return next
    })
  }

  function startDrill() {
    setDrills(shuffle(DRILLS))
    setIdx(0)
    setScore(0)
    setSelected(null)
    setShowFeedback(false)
    setPhase('drill')
  }

  function handleSelect(i: number) {
    if (selected !== null) return
    setSelected(i)
    if (i === current.correct) setScore(s => s + 1)
    setTimeout(() => setShowFeedback(true), 300)
  }

  function handleNext() {
    if (idx >= drills.length - 1) {
      setPhase('done')
    } else {
      setIdx(i => i + 1)
      setSelected(null)
      setShowFeedback(false)
    }
  }

  // ── GALLERY ──────────────────────────────────────────────────────
  if (phase === 'gallery') {
    return (
      <div className="flex flex-col flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full gap-6">
        <p className="text-white/40 text-sm text-center pt-2">
          Toca una tarjeta para ver sus formas verbales. Cuando estés listo, practica.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {VERBS.map(verb => {
            const isFlipped = flipped.has(verb.base)
            return (
              <button
                key={verb.base}
                onClick={() => toggleFlip(verb.base)}
                className={`glass-card p-4 text-left transition-all duration-200 min-h-[108px] relative ${
                  isFlipped
                    ? 'border-violet-500/40 bg-violet-500/5'
                    : 'hover:border-white/20'
                }`}
              >
                {!isFlipped ? (
                  <div className="space-y-1.5">
                    <div className="text-xl font-bold text-white leading-none">{verb.base}</div>
                    <div className="text-xs text-violet-400 font-mono">({verb.phonetic})</div>
                    <div className="text-xs text-white/45 leading-tight">{verb.es}</div>
                    <div className="text-white/20 text-[10px] absolute bottom-2 right-2.5">↻</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-white/30 mb-2">Formas</div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/35">base</span>
                      <span className="text-white font-semibold">{verb.base}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/35">past</span>
                      <span className="text-yellow-300 font-semibold">{verb.past}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/35">p.p.</span>
                      <span className="text-violet-300 font-semibold">{verb.participle}</span>
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex gap-3">
          <Link href="/dashboard" className="btn-ghost flex-1 text-center">← Inicio</Link>
          <button onClick={startDrill} className="btn-primary flex-2 flex-1">
            ⚡ Practicar los 16 verbos
          </button>
        </div>
      </div>
    )
  }

  // ── DRILL ────────────────────────────────────────────────────────
  if (phase === 'drill') {
    const isCorrect = selected === current.correct
    const progress = (idx / drills.length) * 100

    return (
      <div className="flex flex-col flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full gap-5">
        {/* Progress bar */}
        <div className="flex items-center gap-3 pt-2 shrink-0">
          <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-white/35 text-xs tabular-nums shrink-0">
            {idx + 1} / {drills.length}
          </span>
        </div>

        {/* Verb indicator */}
        {verbInfo && (
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="text-3xl font-bold text-white w-16 shrink-0">{verbInfo.base}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-violet-400 font-mono">({verbInfo.phonetic})</div>
              <div className="text-xs text-white/45">{verbInfo.es}</div>
            </div>
            <div className="text-right space-y-1 shrink-0">
              <div className="text-xs">
                <span className="text-white/25">past </span>
                <span className="text-yellow-300 font-medium">{verbInfo.past}</span>
              </div>
              <div className="text-xs">
                <span className="text-white/25">p.p. </span>
                <span className="text-violet-300 font-medium">{verbInfo.participle}</span>
              </div>
            </div>
          </div>
        )}

        {/* Question */}
        <div className="glass-card p-5 text-center">
          <p className="text-white/35 text-xs uppercase tracking-wider mb-3">Completá la oración</p>
          <p className="text-white font-medium text-lg leading-snug">{current.question}</p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {current.options.map((opt, i) => {
            let cls =
              'p-4 rounded-xl text-center text-sm font-medium transition-all border cursor-pointer '
            if (selected === null) {
              cls +=
                'border-white/10 text-white/80 hover:border-yellow-500/50 hover:text-white hover:bg-yellow-500/5'
            } else if (i === current.correct) {
              cls += 'border-green-500/60 bg-green-500/10 text-green-300'
            } else if (i === selected) {
              cls += 'border-red-500/60 bg-red-500/10 text-red-300 shake'
            } else {
              cls += 'border-white/5 text-white/25 cursor-default'
            }
            return (
              <button key={i} className={cls} onClick={() => handleSelect(i)}>
                {opt}
              </button>
            )
          })}
        </div>

        {/* Feedback */}
        {showFeedback && (
          <div
            className={`glass-card p-4 border text-sm slide-up ${
              isCorrect
                ? 'border-green-500/30 bg-green-500/5'
                : 'border-red-500/30 bg-red-500/5'
            }`}
          >
            <p
              className={`font-semibold mb-1 ${
                isCorrect ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {isCorrect ? '✓ ¡Correcto!' : '✗ Incorrecto'}
            </p>
            <p className="text-white/55 text-xs leading-relaxed">{current.explanation}</p>
          </div>
        )}

        {showFeedback && (
          <button className="btn-primary w-full slide-up" onClick={handleNext}>
            {idx >= drills.length - 1 ? 'Ver resultado →' : 'Continuar →'}
          </button>
        )}
      </div>
    )
  }

  // ── DONE ─────────────────────────────────────────────────────────
  const pct = Math.round((score / drills.length) * 100)
  const stars = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 50 ? 1 : 0

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 text-center space-y-6">
      <div className="text-5xl pop-in">{stars >= 3 ? '🏆' : stars === 2 ? '⭐⭐' : stars === 1 ? '⭐' : '💪'}</div>
      <div>
        <h2 className="text-2xl font-bold text-white">
          {pct >= 90 ? '¡Maestro de los verbos!' : pct >= 70 ? '¡Muy bien!' : 'Sigue practicando'}
        </h2>
        <p className="text-white/50 text-sm mt-1">Sesión de 16 verbos completada</p>
      </div>

      <div className="glass-card p-6 w-full max-w-xs space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-white/50">Correctas</span>
          <span className="font-bold text-white">
            {score} / {drills.length}
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              pct >= 70 ? 'bg-green-400' : 'bg-yellow-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/50">Precisión</span>
          <span
            className={`font-bold ${pct >= 70 ? 'text-green-400' : 'text-yellow-400'}`}
          >
            {pct}%
          </span>
        </div>
      </div>

      <div className="flex gap-3 w-full max-w-xs">
        <button onClick={() => setPhase('gallery')} className="btn-ghost flex-1">
          Ver verbos
        </button>
        <button onClick={startDrill} className="btn-primary flex-1">
          Repetir ⚡
        </button>
      </div>
    </div>
  )
}
