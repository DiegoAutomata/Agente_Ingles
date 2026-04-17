'use client'

import { useState } from 'react'
import type { ConceptExercise } from '../../data/lesson-content'

interface Props {
  exercise: ConceptExercise
  onNext: () => void
}

export default function ConceptCard({ exercise, onNext }: Props) {
  const [quizSelected, setQuizSelected] = useState<number | null>(null)
  const hasQuiz = !!exercise.flashQuiz
  const canAdvance = !hasQuiz || quizSelected === exercise.flashQuiz?.correct

  function handleQuizSelect(i: number) {
    if (quizSelected !== null) return
    setQuizSelected(i)
  }

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
