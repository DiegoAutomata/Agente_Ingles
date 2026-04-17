'use client'

import type { ConceptExercise } from '../../data/lesson-content'

interface Props {
  exercise: ConceptExercise
  onNext: () => void
}

export default function ConceptCard({ exercise, onNext }: Props) {
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

      <button onClick={onNext} className="btn-primary w-full">
        Entendido →
      </button>
    </div>
  )
}
