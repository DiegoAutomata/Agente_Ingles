'use client'

import { useState } from 'react'
import type { SentenceBuilderExercise } from '../../data/lesson-content'

interface Props {
  exercise: SentenceBuilderExercise
  onDone: (wasCorrect: boolean) => void
}

function shuffleTiles(tiles: string[]): (string | null)[] {
  const arr = [...tiles]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function SentenceBuilder({ exercise, onDone }: Props) {
  const [slots, setSlots] = useState<(string | null)[]>(
    new Array(exercise.answer.length).fill(null),
  )
  const [available, setAvailable] = useState<(string | null)[]>(() =>
    shuffleTiles(exercise.tiles),
  )
  const [checked, setChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [shaking, setShaking] = useState(false)

  function addToSlot(availIdx: number) {
    if (checked) return
    const word = available[availIdx]
    if (!word) return
    const nextEmpty = slots.findIndex(s => s === null)
    if (nextEmpty === -1) return
    const newSlots = [...slots]
    newSlots[nextEmpty] = word
    setSlots(newSlots)
    const newAvail = [...available]
    newAvail[availIdx] = null
    setAvailable(newAvail)
  }

  function removeFromSlot(slotIdx: number) {
    if (checked) return
    const word = slots[slotIdx]
    if (!word) return
    const newSlots = [...slots]
    newSlots[slotIdx] = null
    setSlots(newSlots)
    const newAvail = [...available]
    const emptySpot = newAvail.findIndex(a => a === null)
    if (emptySpot !== -1) newAvail[emptySpot] = word
    else newAvail.push(word)
    setAvailable(newAvail)
  }

  function handleCheck() {
    if (slots.some(s => s === null)) return
    const correct = slots.every((s, i) => s === exercise.answer[i])
    setIsCorrect(correct)
    setChecked(true)
    if (!correct) {
      setShaking(true)
      setTimeout(() => setShaking(false), 450)
    }
  }

  const allFilled = slots.every(s => s !== null)

  return (
    <div className="space-y-5">
      <p className="text-white/55 text-sm text-center">{exercise.instruction}</p>

      {/* Answer slots */}
      <div
        className={`flex flex-wrap gap-2 justify-center min-h-14 p-4 rounded-xl border transition-colors ${
          checked
            ? isCorrect
              ? 'border-green-500/40 bg-green-500/5'
              : 'border-red-500/40 bg-red-500/5'
            : 'border-white/10 bg-white/5'
        } ${shaking ? 'shake' : ''}`}
      >
        {slots.map((word, i) => (
          <button
            key={i}
            onClick={() => removeFromSlot(i)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border min-w-12 text-center ${
              word
                ? checked
                  ? isCorrect
                    ? 'border-green-500/50 bg-green-500/10 text-green-300 cursor-default'
                    : 'border-red-500/40 bg-red-500/10 text-red-300 cursor-default'
                  : 'border-violet-500/50 bg-violet-500/15 text-violet-200 hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-300'
                : 'border-white/15 border-dashed text-white/20 cursor-default'
            }`}
          >
            {word ?? '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0'}
          </button>
        ))}
      </div>

      {/* Available tiles */}
      <div className="flex flex-wrap gap-2 justify-center min-h-10">
        {available.map((word, i) =>
          word ? (
            <button
              key={i}
              onClick={() => addToSlot(i)}
              disabled={checked}
              className="px-3 py-2 rounded-lg text-sm font-medium border border-white/20 bg-white/5 text-white/80 hover:border-violet-500/50 hover:text-white transition-all disabled:opacity-40 disabled:cursor-default"
            >
              {word}
            </button>
          ) : null,
        )}
      </div>

      {/* Feedback */}
      {checked && (
        <div
          className={`glass-card p-3 text-center border slide-up ${
            isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
          }`}
        >
          <p className={`font-semibold text-sm ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
            {isCorrect ? '✓ ¡Perfecto!' : `✗ Correcto: ${exercise.answer.join(' ')}`}
          </p>
        </div>
      )}

      {!checked ? (
        <button
          onClick={handleCheck}
          disabled={!allFilled}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
            allFilled
              ? 'btn-primary'
              : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10'
          }`}
        >
          Verificar
        </button>
      ) : (
        <button className="btn-primary w-full slide-up" onClick={() => onDone(isCorrect)}>
          Continuar →
        </button>
      )}
    </div>
  )
}
