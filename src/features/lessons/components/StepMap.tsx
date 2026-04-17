import type { Exercise } from '../data/lesson-content'

const ICONS: Record<Exercise['type'], string> = {
  concept:          '💡',
  multiple_choice:  '❓',
  word_match:       '🔗',
  sentence_builder: '🔨',
  fill_blank:       '✏️',
}

interface StepRecord {
  type: Exercise['type']
  wasCorrect?: boolean
}

interface Props {
  steps: StepRecord[]
  currentIdx: number
}

export default function StepMap({ steps, currentIdx }: Props) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
      {steps.map((step, i) => {
        const isDone    = i < currentIdx
        const isCurrent = i === currentIdx
        const isWrong   = isDone && step.wasCorrect === false

        return (
          <div
            key={i}
            className={`shrink-0 flex items-center justify-center rounded-lg text-xs transition-all ${
              isCurrent
                ? 'w-8 h-8 bg-violet-500/30 border border-violet-500/50 text-base'
                : isDone
                ? isWrong
                  ? 'w-6 h-6 bg-red-500/15 border border-red-500/30'
                  : 'w-6 h-6 bg-green-500/15 border border-green-500/30'
                : 'w-6 h-6 bg-white/5 border border-white/10'
            }`}
            title={`${ICONS[step.type]} ${step.type}`}
          >
            {isCurrent ? (
              ICONS[step.type]
            ) : isDone ? (
              <span className={isWrong ? 'text-red-400' : 'text-green-400'}>
                {isWrong ? '✗' : '✓'}
              </span>
            ) : (
              <span className="text-white/20 text-[10px]">{ICONS[step.type]}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
