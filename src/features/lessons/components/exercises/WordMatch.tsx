'use client'

import { useState } from 'react'
import type { WordMatchExercise } from '../../data/lesson-content'

interface Props {
  exercise: WordMatchExercise
  onComplete: () => void
  onMistake: () => void
}

function shuffleIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function WordMatch({ exercise, onComplete, onMistake }: Props) {
  const [rightOrder] = useState(() => shuffleIndices(exercise.pairs.length))
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [wrongRight, setWrongRight] = useState<number | null>(null)
  const [wrongLeft, setWrongLeft] = useState<number | null>(null)
  const [allDone, setAllDone] = useState(false)

  function handleLeft(originalIdx: number) {
    if (matched.has(originalIdx) || allDone) return
    setSelectedLeft(originalIdx)
  }

  function handleRight(shuffledPos: number) {
    if (allDone) return
    const originalIdx = rightOrder[shuffledPos]
    if (matched.has(originalIdx)) return
    if (selectedLeft === null) return

    if (originalIdx === selectedLeft) {
      const next = new Set(matched)
      next.add(originalIdx)
      setMatched(next)
      setSelectedLeft(null)
      if (next.size === exercise.pairs.length) {
        setAllDone(true)
        setTimeout(onComplete, 700)
      }
    } else {
      setWrongRight(shuffledPos)
      setWrongLeft(selectedLeft)
      setSelectedLeft(null)
      onMistake()
      setTimeout(() => {
        setWrongRight(null)
        setWrongLeft(null)
      }, 500)
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-white/55 text-sm text-center">{exercise.instruction}</p>

      <div className="grid grid-cols-2 gap-3">
        {/* Left column */}
        <div className="space-y-3">
          {exercise.pairs.map((pair, i) => {
            const isMatched = matched.has(i)
            const isSelected = selectedLeft === i
            const isWrong = wrongLeft === i
            return (
              <button
                key={i}
                onClick={() => handleLeft(i)}
                className={`w-full p-3 rounded-xl text-sm font-medium border transition-all text-center ${
                  isMatched
                    ? 'border-green-500/40 bg-green-500/10 text-green-300 cursor-default'
                    : isWrong
                    ? 'border-red-500/50 bg-red-500/10 text-red-300 shake cursor-default'
                    : isSelected
                    ? 'border-violet-500/70 bg-violet-500/20 text-violet-200 scale-105'
                    : 'border-white/10 text-white/75 hover:border-white/30 hover:bg-white/5'
                }`}
              >
                {pair.left}
              </button>
            )
          })}
        </div>

        {/* Right column (shuffled) */}
        <div className="space-y-3">
          {rightOrder.map((originalIdx, shuffledPos) => {
            const pair = exercise.pairs[originalIdx]
            const isMatched = matched.has(originalIdx)
            const isWrong = wrongRight === shuffledPos
            const isClickable = selectedLeft !== null && !isMatched
            return (
              <button
                key={shuffledPos}
                onClick={() => handleRight(shuffledPos)}
                className={`w-full p-3 rounded-xl text-sm font-medium border transition-all text-center ${
                  isMatched
                    ? 'border-green-500/40 bg-green-500/10 text-green-300 cursor-default'
                    : isWrong
                    ? 'border-red-500/50 bg-red-500/10 text-red-300 shake'
                    : isClickable
                    ? 'border-white/20 text-white/80 hover:border-violet-400/60 hover:bg-violet-500/10 cursor-pointer'
                    : 'border-white/10 text-white/45 cursor-default'
                }`}
              >
                {pair.right}
              </button>
            )
          })}
        </div>
      </div>

      {allDone && (
        <div className="glass-card p-4 border border-green-500/30 bg-green-500/5 text-center pop-in">
          <p className="text-green-400 font-semibold text-sm">¡Todos conectados! ✓</p>
        </div>
      )}

      {!allDone && selectedLeft === null && matched.size === 0 && (
        <p className="text-white/30 text-xs text-center">Toca una palabra de la izquierda para empezar</p>
      )}
    </div>
  )
}
