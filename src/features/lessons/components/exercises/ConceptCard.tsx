'use client'

import { useState, useCallback } from 'react'
import type { ConceptExercise } from '../../data/lesson-content'

interface Props {
  exercise: ConceptExercise
  onNext: () => void
}

function SpeakButton({ text, idx, speaking, onSpeak }: {
  text: string
  idx: number
  speaking: number | null
  onSpeak: (text: string, idx: number) => void
}) {
  const isActive = speaking === idx
  return (
    <button
      onClick={() => onSpeak(text, idx)}
      title={`Escuchar: "${text}"`}
      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all border ${
        isActive
          ? 'border-violet-400/60 bg-violet-500/20 text-violet-300 scale-110'
          : 'border-white/10 text-white/30 hover:border-violet-500/40 hover:text-violet-300 hover:bg-violet-500/10'
      }`}
    >
      {isActive ? (
        <span className="flex gap-0.5 items-end h-4">
          <span className="w-0.5 bg-violet-400 rounded-full animate-[soundbar_0.6s_ease-in-out_infinite]" style={{ height: '40%', animationDelay: '0s' }} />
          <span className="w-0.5 bg-violet-400 rounded-full animate-[soundbar_0.6s_ease-in-out_infinite]" style={{ height: '100%', animationDelay: '0.15s' }} />
          <span className="w-0.5 bg-violet-400 rounded-full animate-[soundbar_0.6s_ease-in-out_infinite]" style={{ height: '60%', animationDelay: '0.3s' }} />
          <span className="w-0.5 bg-violet-400 rounded-full animate-[soundbar_0.6s_ease-in-out_infinite]" style={{ height: '80%', animationDelay: '0.1s' }} />
        </span>
      ) : (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M7 4a1 1 0 00-1.414 0l-3 3A1 1 0 002 8v4a1 1 0 00.293.707l3 3A1 1 0 007 15V4zM9 6a1 1 0 012 0v8a1 1 0 01-2 0V6zM13.5 7.5a1 1 0 011.732-1 5 5 0 010 7 1 1 0 01-1.732-1 3 3 0 000-5z" />
        </svg>
      )}
    </button>
  )
}

export default function ConceptCard({ exercise, onNext }: Props) {
  const [quizSelected, setQuizSelected] = useState<number | null>(null)
  const [speaking, setSpeaking] = useState<number | null>(null)

  const hasQuiz = !!exercise.flashQuiz
  const canAdvance = !hasQuiz || quizSelected === exercise.flashQuiz?.correct

  function handleQuizSelect(i: number) {
    if (quizSelected !== null) return
    setQuizSelected(i)
  }

  const speakWord = useCallback((text: string, idx: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.78
    utterance.pitch = 1.05

    // Prefer a high-quality English voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v =>
      v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Alex'))
    ) ?? voices.find(v => v.lang.startsWith('en'))
    if (preferred) utterance.voice = preferred

    utterance.onstart  = () => setSpeaking(idx)
    utterance.onend    = () => setSpeaking(null)
    utterance.onerror  = () => setSpeaking(null)

    window.speechSynthesis.speak(utterance)
  }, [])

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="text-5xl">{exercise.icon}</div>
        <h2 className="text-xl font-bold text-white">{exercise.title}</h2>
      </div>

      <div className="glass-card p-4 border-violet-500/20">
        <p className="text-white/80 text-sm leading-relaxed">{exercise.rule}</p>
      </div>

      {exercise.examples.length > 0 && (
        <div className="space-y-2">
          {exercise.examples.map((ex, i) => (
            <div
              key={i}
              className="flex items-center gap-3 glass-card p-3 pop-in"
              style={{ animationDelay: `${i * 0.07}s`, opacity: 0 }}
            >
              {/* Audio button */}
              <SpeakButton text={ex.en} idx={i} speaking={speaking} onSpeak={speakWord} />

              <span className="font-bold text-violet-300 text-sm w-24 shrink-0">{ex.en}</span>
              {ex.phonetic && (
                <span className="text-white/30 text-xs w-28 shrink-0">{ex.phonetic}</span>
              )}
              <span className="text-white/60 text-sm">{ex.es}</span>
            </div>
          ))}
        </div>
      )}

      {exercise.highlight && (
        <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-3 text-center">
          <p className="text-violet-300 text-sm font-medium">{exercise.highlight}</p>
        </div>
      )}

      {/* Flash Quiz */}
      {exercise.flashQuiz && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <p className="text-white/50 text-xs uppercase tracking-wider text-center">
            ✅ Verificá que entendiste
          </p>
          <p className="text-white text-sm font-medium text-center">{exercise.flashQuiz.question}</p>
          <div className="grid grid-cols-2 gap-2">
            {exercise.flashQuiz.options.map((opt, i) => {
              let cls =
                'py-2.5 px-3 rounded-xl text-sm text-center border transition-all cursor-pointer '
              if (quizSelected === null) {
                cls += 'border-white/10 text-white/70 hover:border-violet-500/40 hover:text-white'
              } else if (i === exercise.flashQuiz!.correct) {
                cls += 'border-green-500/60 bg-green-500/10 text-green-300'
              } else if (i === quizSelected) {
                cls += 'border-red-500/60 bg-red-500/10 text-red-300'
              } else {
                cls += 'border-white/5 text-white/20 cursor-default'
              }
              return (
                <button key={i} className={cls} onClick={() => handleQuizSelect(i)}>
                  {opt}
                </button>
              )
            })}
          </div>
          {quizSelected !== null && quizSelected !== exercise.flashQuiz.correct && (
            <p className="text-red-400 text-xs text-center slide-up">
              Incorrecto — seleccioná la respuesta correcta para continuar
            </p>
          )}
        </div>
      )}

      <button
        onClick={onNext}
        disabled={!canAdvance}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
          canAdvance
            ? 'btn-primary'
            : 'bg-white/5 text-white/25 border border-white/10 cursor-not-allowed'
        }`}
      >
        {hasQuiz && quizSelected === null ? 'Respondé el quiz para continuar' : 'Entendido →'}
      </button>
    </div>
  )
}
