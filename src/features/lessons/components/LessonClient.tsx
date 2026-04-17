'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getLessonContent } from '../data/lesson-content'
import { useLives } from '../hooks/useLives'
import ConceptCard from './exercises/ConceptCard'
import MultipleChoice from './exercises/MultipleChoice'
import WordMatch from './exercises/WordMatch'
import SentenceBuilder from './exercises/SentenceBuilder'
import { createClient } from '@/lib/supabase/client'

interface Props {
  lessonNumber: number
  mode: 'lesson' | 'challenge'
}

function RechargeCountdown({ target }: { target: number }) {
  const diff = Math.max(0, target - Date.now())
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return (
    <div className="text-3xl font-bold font-mono text-violet-300">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}
    </div>
  )
}

export default function LessonClient({ lessonNumber, mode }: Props) {
  const content = getLessonContent(lessonNumber)
  const isChallenge = mode === 'challenge'
  const { lives, loseLife, nextRechargeAt } = useLives(isChallenge)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [slideKey, setSlideKey] = useState(0)
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [outOfLives, setOutOfLives] = useState(false)

  const total = content.exercises.length
  const exercise = content.exercises[currentIndex]
  const progress = (currentIndex / total) * 100
  const scoredTotal = content.exercises.filter(e => e.type !== 'concept').length

  function goNext(newScore: number) {
    if (currentIndex >= total - 1) {
      doFinish(newScore)
    } else {
      setCurrentIndex(i => i + 1)
      setSlideKey(k => k + 1)
    }
  }

  function handleDone(wasCorrect: boolean) {
    const newScore = wasCorrect ? score + 1 : score
    if (wasCorrect) setScore(newScore)

    if (!wasCorrect && isChallenge) {
      const remaining = loseLife()
      if (remaining <= 0) {
        setOutOfLives(true)
        return
      }
    }

    goNext(newScore)
  }

  function handleMistake() {
    if (!isChallenge) return
    const remaining = loseLife()
    if (remaining <= 0) setOutOfLives(true)
  }

  async function doFinish(finalScore: number) {
    const accuracy = scoredTotal > 0 ? finalScore / scoredTotal : 1
    const xp = Math.round(accuracy * content.xpReward * (isChallenge ? 2 : 1))
    setXpEarned(xp)
    setCompleted(true)

    try {
      if (!isChallenge) {
        await fetch('/api/complete-lesson', { method: 'POST' })
      } else {
        const supabase = createClient()
        await supabase.rpc('increment_xp', { xp_amount: xp })
      }
    } catch {
      // offline / supabase not configured
    }
  }

  // ── Out of lives ──────────────────────────────────────────────
  if (outOfLives) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8 text-center space-y-5">
        <div className="text-6xl pop-in">💔</div>
        <div>
          <h2 className="text-2xl font-bold text-white">Sin vidas</h2>
          <p className="text-white/50 text-sm mt-1">Las vidas se recargan de a una cada 4 horas</p>
        </div>
        {nextRechargeAt && <RechargeCountdown target={nextRechargeAt} />}
        <Link href="/dashboard" className="btn-ghost">← Volver al inicio</Link>
      </div>
    )
  }

  // ── Completion ────────────────────────────────────────────────
  if (completed) {
    const accuracy = scoredTotal > 0 ? Math.round((score / scoredTotal) * 100) : 100
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-8 text-center space-y-6">
        <div className="text-6xl pop-in">🎉</div>
        <div>
          <h2 className="text-2xl font-bold text-white">¡Lección completada!</h2>
          <p className="text-white/50 text-sm mt-1">{content.title}</p>
        </div>

        <div className="glass-card p-6 w-full max-w-xs space-y-3">
          {scoredTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Precisión</span>
              <span className="font-bold text-white">{accuracy}%</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-white/50">XP ganados</span>
            <span className="font-bold text-yellow-400">
              +{xpEarned} XP{isChallenge ? ' ×2' : ''}
            </span>
          </div>
          {isChallenge && (
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Vidas restantes</span>
              <span className="text-red-400">
                {'♥'.repeat(lives)}{'♡'.repeat(Math.max(0, 3 - lives))}
              </span>
            </div>
          )}
        </div>

        <Link href="/dashboard" className="btn-primary">← Inicio</Link>
      </div>
    )
  }

  // ── Slide ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full gap-6">
      {/* Progress bar + lives */}
      <div className="flex items-center gap-3 pt-2 shrink-0">
        <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-white/35 text-xs shrink-0 tabular-nums">
          {currentIndex}/{total}
        </span>
        {isChallenge && (
          <div className="flex gap-0.5 shrink-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                className={`text-base leading-none transition-all ${
                  i < lives ? 'text-red-400' : 'text-white/15'
                }`}
              >
                ♥
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Current exercise */}
      <div key={slideKey} className="slide-up">
        {exercise.type === 'concept' && (
          <ConceptCard exercise={exercise} onNext={() => goNext(score)} />
        )}
        {exercise.type === 'multiple_choice' && (
          <MultipleChoice exercise={exercise} onDone={handleDone} />
        )}
        {exercise.type === 'word_match' && (
          <WordMatch
            exercise={exercise}
            onComplete={() => handleDone(true)}
            onMistake={handleMistake}
          />
        )}
        {exercise.type === 'sentence_builder' && (
          <SentenceBuilder exercise={exercise} onDone={handleDone} />
        )}
      </div>
    </div>
  )
}
