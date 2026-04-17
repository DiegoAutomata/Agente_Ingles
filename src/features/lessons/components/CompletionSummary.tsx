import Link from 'next/link'
import type { Exercise } from '../data/lesson-content'

const TYPE_LABELS: Record<Exercise['type'], string> = {
  concept:          'Concepto',
  multiple_choice:  'Opción múltiple',
  word_match:       'Relacionar',
  sentence_builder: 'Construir oración',
  fill_blank:       'Completar',
}

const TYPE_ICONS: Record<Exercise['type'], string> = {
  concept:          '💡',
  multiple_choice:  '❓',
  word_match:       '🔗',
  sentence_builder: '🔨',
  fill_blank:       '✏️',
}

interface AnswerRecord {
  type: Exercise['type']
  wasCorrect: boolean
}

interface Props {
  isChallenge: boolean
  score: number
  scoredTotal: number
  xpEarned: number
  lives: number
  answers: AnswerRecord[]
  lessonTitle: string
}

export default function CompletionSummary({
  isChallenge,
  score,
  scoredTotal,
  xpEarned,
  lives,
  answers,
  lessonTitle,
}: Props) {
  const accuracy  = scoredTotal > 0 ? Math.round((score / scoredTotal) * 100) : 100
  const scoredAnswers = answers.filter(a => a.type !== 'concept')

  return (
    <div className="flex flex-col flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full gap-6">
      {/* Trophy */}
      <div className="text-center pt-4">
        <div className="text-5xl pop-in">🎉</div>
        <h2 className="text-2xl font-bold text-white mt-3">
          {isChallenge ? '¡Desafío completado!' : '¡Lección completada!'}
        </h2>
        <p className="text-white/40 text-sm mt-1">{lessonTitle}</p>
      </div>

      {/* Stats */}
      <div className="glass-card p-5 space-y-4">
        {scoredTotal > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Precisión</span>
              <span className={`font-bold ${accuracy >= 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                {accuracy}%
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  accuracy >= 70 ? 'bg-green-400' : 'bg-yellow-400'
                }`}
                style={{ width: `${accuracy}%` }}
              />
            </div>
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

      {/* Per-exercise breakdown */}
      {scoredAnswers.length > 0 && (
        <div>
          <p className="text-white/30 text-xs uppercase tracking-wider mb-2">Resumen por ejercicio</p>
          <div className="space-y-1.5">
            {scoredAnswers.map((a, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${
                  a.wasCorrect
                    ? 'border-green-500/20 bg-green-500/5'
                    : 'border-red-500/20 bg-red-500/5'
                }`}
              >
                <span className="text-base">{TYPE_ICONS[a.type]}</span>
                <span className="text-white/60 flex-1">{TYPE_LABELS[a.type]}</span>
                <span className={a.wasCorrect ? 'text-green-400' : 'text-red-400'}>
                  {a.wasCorrect ? '✓' : '✗'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex gap-3 pb-4">
        <Link href="/dashboard" className="btn-ghost flex-1 text-center">
          ← Inicio
        </Link>
        <Link
          href={isChallenge ? '/challenge' : '/lesson'}
          className="btn-primary flex-1 text-center"
        >
          {isChallenge ? 'Otro desafío ⚔️' : 'Siguiente lección →'}
        </Link>
      </div>
    </div>
  )
}
