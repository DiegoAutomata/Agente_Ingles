'use client'

import { useState } from 'react'
import type { MultipleChoiceExercise } from '../../data/lesson-content'

interface Props {
  exercise: MultipleChoiceExercise
  onDone: (wasCorrect: boolean) => void
}

export default function MultipleChoice({ exercise, onDone }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const [showContinue, setShowContinue] = useState(false)

  function handleSelect(i: number) {
    if (selected !== null) return
    setSelected(i)
    setTimeout(() => setShowContinue(true), 350)
  }

  const isCorrect = selected === exercise.correct

  return (
    <div className="space-y-5">
      <div className="glass-card p-5 text-center">
        <p className="text-white font-medium text-lg leading-snug">{exercise.question}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {exercise.options.map((opt, i) => {
          let cls =
            'p-4 rounded-xl text-center text-sm font-medium transition-all border cursor-pointer '

          if (selected === null) {
            cls += 'border-white/10 text-white/80 hover:border-violet-500/50 hover:text-white hover:bg-violet-500/5'
          } else if (i === exercise.correct) {
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

      {selected !== null && (
        <div
          className={`glass-card p-4 border text-sm slide-up ${
            isCorrect
              ? 'border-green-500/30 bg-green-500/5'
              : 'border-red-500/30 bg-red-500/5'
          }`}
        >
          <p className={`font-semibold mb-1 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
            {isCorrect ? '✓ ¡Correcto!' : '✗ Incorrecto'}
          </p>
          <p className="text-white/55 text-xs leading-relaxed">{exercise.explanation}</p>
        </div>
      )}

      {showContinue && (
        <button
          className="btn-primary w-full slide-up"
          onClick={() => onDone(isCorrect)}
        >
          Continuar →
        </button>
      )}
    </div>
  )
}
