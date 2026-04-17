export interface ConceptExercise {
  type: 'concept'
  title: string
  icon: string
  rule: string
  examples: { en: string; phonetic?: string; es: string }[]
  highlight?: string
  flashQuiz?: { question: string; options: string[]; correct: number }
}

export interface FillBlankExercise {
  type: 'fill_blank'
  sentence: string
  options: string[]
  correct: number
  explanation: string
}

export interface MultipleChoiceExercise {
  type: 'multiple_choice'
  question: string
  options: string[]
  correct: number
  explanation: string
}

export interface WordMatchExercise {
  type: 'word_match'
  instruction: string
  pairs: { left: string; right: string }[]
}

export interface SentenceBuilderExercise {
  type: 'sentence_builder'
  instruction: string
  answer: string[]
  tiles: string[]
}

export type Exercise =
  | ConceptExercise
  | MultipleChoiceExercise
  | WordMatchExercise
  | SentenceBuilderExercise
  | FillBlankExercise

export interface LessonContent {
  lessonNumber: number
  title: string
  subtitle: string
  colorFrom: string
  colorTo: string
  xpReward: number
  exercises: Exercise[]
}

export async function getLessonContentAsync(
  league: string,
  level: number,
): Promise<LessonContent> {
  let record: Record<number, LessonContent>

  switch (league) {
    case 'plata':
      record = (await import('./content-plata')).default
      break
    case 'oro':
      record = (await import('./content-oro')).default
      break
    case 'diamante':
      record = (await import('./content-diamante')).default
      break
    case 'maestro':
      record = (await import('./content-maestro')).default
      break
    case 'gran_maestro':
      record = (await import('./content-gran-maestro')).default
      break
    default:
      record = (await import('./content-bronce')).default
  }

  return record[level] ?? record[1]
}

export { buildChallengeContent } from './challenge-pool'
