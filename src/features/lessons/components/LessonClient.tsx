'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getLessonContentAsync, buildChallengeContent, type LessonContent } from '../data/lesson-content'
import { LEAGUES } from '@/shared/constants/leagues'
import { useLives } from '../hooks/useLives'
import ConceptCard from './exercises/ConceptCard'
import MultipleChoice from './exercises/MultipleChoice'
import WordMatch from './exercises/WordMatch'
import SentenceBuilder from './exercises/SentenceBuilder'
import FillBlank from './exercises/FillBlank'
import StepMap from './StepMap'
import CompletionSummary from './CompletionSummary'
import { createClient } from '@/lib/supabase/client'

interface AnswerRecord {
  type: LessonContent['exercises'][number]['type']
  wasCorrect: boolean
  question?: string
  correctAnswer?: string
}

function buildLessonTranscript(
  answers: AnswerRecord[],
  lessonTitle: string,
): Array<{ role: string; content: string }> {
  const msgs: Array<{ role: string; content: string }> = [
    { role: 'assistant', content: `Lesson: "${lessonTitle}". Practice session.` },
  ]
  for (const a of answers) {
    if (a.type === 'concept') continue
    if (a.question) msgs.push({ role: 'assistant', content: a.question })
    const outcome = a.wasCorrect ? '[correct]' : '[incorrect]'
    const detail = a.correctAnswer ? ` Correct answer: "${a.correctAnswer}"` : ''
    msgs.push({ role: 'user', content: `${outcome}${detail}` })
  }
  return msgs
}

interface Props {
  serverLesson: number
  league: string
  mode: 'lesson' | 'challenge'
}

interface LocalProgress {
  league: string
  lesson: number
}

function getLocalProgress(fallbackLeague: string, fallbackLesson: number): LocalProgress {
  try {
    const raw = localStorage.getItem('alex-progress')
    if (raw) return JSON.parse(raw) as LocalProgress
  } catch { /* ignore */ }
  return { league: fallbackLeague, lesson: fallbackLesson }
}

function saveLocalProgress(league: string, lesson: number) {
  try {
    localStorage.setItem('alex-progress', JSON.stringify({ league, lesson }))
  } catch { /* ignore */ }
}

function getMaxLevels(leagueId: string): number {
  return LEAGUES.find(l => l.id === leagueId)?.levels ?? 11
}

function getNextLeague(currentId: string): string | null {
  const idx = LEAGUES.findIndex(l => l.id === currentId)
  return idx >= 0 && idx < LEAGUES.length - 1 ? LEAGUES[idx + 1].id : null
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

export default function LessonClient({ serverLesson, league: serverLeague, mode }: Props) {
  const isChallenge = mode === 'challenge'
  const { lives, loseLife, nextRechargeAt } = useLives(isChallenge)

  const [content, setContent] = useState<LessonContent | null>(null)
  const [actualLesson, setActualLesson] = useState<number | null>(null)
  const [actualLeague, setActualLeague] = useState<string>(serverLeague)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [slideKey, setSlideKey] = useState(0)
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [outOfLives, setOutOfLives] = useState(false)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])

  // Resolve actual lesson from localStorage vs server
  useEffect(() => {
    const local = getLocalProgress(serverLeague, serverLesson)
    const resolvedLeague = local.league ?? serverLeague
    const resolvedLesson = Math.max(serverLesson, local.lesson)
    setActualLeague(resolvedLeague)
    setActualLesson(resolvedLesson)
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
          // fallback: load bronce L1
          getLessonContentAsync('bronce', 1).then(setContent)
        })
    }
  }, [actualLesson, actualLeague, isChallenge])

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
    const xp = Math.round(accuracy * loadedContent.xpReward * (isChallenge ? 2 : 1))
    setXpEarned(xp)
    setCompleted(true)

    if (!isChallenge) {
      const maxLevels = getMaxLevels(actualLeague)
      let nextLeague = actualLeague
      let nextLesson = loadedLesson + 1
      if (loadedLesson >= maxLevels) {
        const next = getNextLeague(actualLeague)
        if (next) {
          nextLeague = next
          nextLesson = 1
        } else {
          nextLesson = maxLevels
        }
      }
      saveLocalProgress(nextLeague, nextLesson)

      try {
        await fetch('/api/complete-lesson', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ xp_amount: xp }),
        })
      } catch { /* offline */ }
    } else {
      try {
        const supabase = createClient()
        await supabase.rpc('increment_xp', { xp_amount: xp })
      } catch { /* offline */ }
    }

    // Fire-and-forget: update learner profile with session analysis
    const transcript = buildLessonTranscript(answers, loadedContent.title)
    if (transcript.length >= 3) {
      fetch('/api/analyze-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          session_id: `lesson-${actualLeague}-${loadedLesson}-${Date.now()}`,
        }),
      }).catch(() => {})
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
        {exercise.type === 'fill_blank' && (
          <FillBlank exercise={exercise} onDone={handleDone} />
        )}
      </div>
    </div>
  )
}
