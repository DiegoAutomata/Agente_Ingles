'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getLessonContentAsync, buildChallengeContent, type LessonContent } from '../data/lesson-content'
import { useLives } from '../hooks/useLives'
import ConceptCard from './exercises/ConceptCard'
import MultipleChoice from './exercises/MultipleChoice'
import WordMatch from './exercises/WordMatch'
import SentenceBuilder from './exercises/SentenceBuilder'
import FillBlank from './exercises/FillBlank'
import StepMap from './StepMap'
import CompletionSummary from './CompletionSummary'

interface AnswerRecord {
  type: LessonContent['exercises'][number]['type']
  wasCorrect: boolean
  question?: string
  correctAnswer?: string
}

interface Props {
  serverLesson: number
  league: string
  mode: 'lesson' | 'challenge'
  userId?: string
}

function RechargeCountdown({ target }: { target: number }) {
  const [now, setNow] = useState(0)
  useEffect(() => {
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  if (!now) return <p>Cargando tiempo de recarga…</p>
  const diff = Math.max(0, target - now)
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return (
    <div className="text-3xl font-bold font-mono text-violet-300">
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}
    </div>
  )
}

export default function LessonClient({ serverLesson, league: serverLeague, mode, userId }: Props) {
  const isChallenge = mode === 'challenge'
  const { lives, loseLife, nextRechargeAt } = useLives(isChallenge, userId)

  const [content, setContent] = useState<LessonContent | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [actualLesson, setActualLesson] = useState<number | null>(null)
  const [actualLeague, setActualLeague] = useState<string>(serverLeague)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [slideKey, setSlideKey] = useState(0)
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const pendingScore = useRef<number | null>(null)
  const saveLock = useRef(false)
  const hadMatchMistake = useRef(false)

  // The authenticated server profile is the source of progress.
  useEffect(() => {
    setActualLeague(serverLeague)
    setActualLesson(serverLesson)
  }, [serverLesson, serverLeague])

  // Load content once lesson is resolved
  useEffect(() => {
    if (actualLesson === null) return

    if (isChallenge) {
      const exercises = buildChallengeContent(actualLeague)
      setContent({
        lessonNumber: actualLesson,
        title: 'Modo Desafío',
        subtitle: `Liga ${actualLeague} — 7 ejercicios aleatorios`,
        colorFrom: 'from-yellow-500',
        colorTo: 'to-orange-400',
        xpReward: 80,
        exercises,
      })
    } else {
      getLessonContentAsync(actualLeague, actualLesson)
        .then(setContent)
        .catch(() => {
          setLoadError(true)
        })
    }
  }, [actualLesson, actualLeague, isChallenge])

  if (loadError) return <div role="alert" className="p-6 space-y-4">
    <p>No se pudo cargar esta lección. Tu progreso está guardado.</p>
    <button className="btn-primary" onClick={() => window.location.reload()}>Reintentar</button>
  </div>
  if (!content || actualLesson === null) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div className="text-white/30 text-sm animate-pulse">Cargando lección…</div>
      </div>
    )
  }

  // Narrowed non-null references for use in closures below
  const loadedContent = content
  const loadedLesson = actualLesson

  const total = loadedContent.exercises.length
  const exercise = loadedContent.exercises[currentIndex]
  const progress = (currentIndex / total) * 100
  const scoredTotal = loadedContent.exercises.filter(e => e.type !== 'concept').length

  function goNext(newScore: number) {
    if (currentIndex >= total - 1) {
      doFinish(newScore)
    } else {
      setCurrentIndex(i => i + 1)
      setSlideKey(k => k + 1)
    }
  }

  function handleDone(wasCorrect: boolean) {
    if (exercise.type === 'word_match' && hadMatchMistake.current) wasCorrect = false
    hadMatchMistake.current = false
    const newScore = wasCorrect ? score + 1 : score
    if (wasCorrect) setScore(newScore)

    // Capture exercise context for analyze-session transcript
    let question: string | undefined
    let correctAnswer: string | undefined
    if (exercise.type === 'multiple_choice') {
      question = exercise.question
      correctAnswer = exercise.options[exercise.correct]
    } else if (exercise.type === 'fill_blank') {
      question = exercise.sentence
      correctAnswer = exercise.options[exercise.correct]
    } else if (exercise.type === 'sentence_builder') {
      question = exercise.instruction
      correctAnswer = exercise.answer.join(' ')
    } else if (exercise.type === 'word_match') {
      question = exercise.instruction
      correctAnswer = 'matched all word pairs'
    }

    setAnswers(prev => [...prev, { type: exercise.type, wasCorrect, question, correctAnswer }])

    if (!wasCorrect && isChallenge && exercise.type !== 'word_match') {
      const remaining = loseLife()
      if (remaining <= 0) {
        return
      }
    }

    goNext(newScore)
  }

  function handleMistake() {
    hadMatchMistake.current = true
    if (!isChallenge) return
    const remaining = loseLife()
    if (remaining <= 0) return
  }

  async function doFinish(finalScore: number) {
    if (saveLock.current) return
    saveLock.current = true
    pendingScore.current = finalScore
    setSaving(true)
    setSaveError(null)
    try {
      const response = await fetch('/api/complete-lesson', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, league: actualLeague, lesson: loadedLesson }),
      })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error || 'No se pudo guardar. Reintenta sin cerrar esta pantalla.')
      setXpEarned(result.result.xp_awarded)
      setCompleted(true)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar. Reintenta.')
    } finally {
      saveLock.current = false
      setSaving(false)
    }
  }

  if (saving || saveError) return (
    <div className="p-6 space-y-4 max-w-lg mx-auto">
      {saving ? <p role="status">Guardando tu progreso…</p> : <>
        <p role="alert" className="text-red-300">{saveError}</p>
        <button className="btn-primary" onClick={() => doFinish(pendingScore.current ?? score)}>Reintentar guardado</button>
        <Link className="btn-ghost" href="/dashboard">Volver al inicio</Link>
      </>}
    </div>
  )

  // ── Out of lives ──────────────────────────────────────────────
  if (isChallenge && lives <= 0) {
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
    return (
      <CompletionSummary
        isChallenge={isChallenge}
        score={score}
        scoredTotal={scoredTotal}
        xpEarned={xpEarned}
        lives={lives}
        answers={answers}
        lessonTitle={loadedContent.title}
      />
    )
  }

  // ── Slide ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full gap-6">
      {/* Step map */}
      <div className="shrink-0 pt-2">
        <StepMap
          steps={loadedContent.exercises.map((e, i) => ({
            type: e.type,
            wasCorrect: i < currentIndex ? answers[i]?.wasCorrect : undefined,
          }))}
          currentIdx={currentIndex}
        />
      </div>

      {/* Progress bar + lives */}
      <div className="flex items-center gap-3 shrink-0">
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
          <ConceptCard exercise={exercise} onNext={() => {
            setAnswers(prev => [...prev, { type: 'concept', wasCorrect: true }])
            goNext(score)
          }} />
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
        {exercise.type === 'fill_blank' && (
          <FillBlank exercise={exercise} onDone={handleDone} />
        )}
      </div>
    </div>
  )
}
