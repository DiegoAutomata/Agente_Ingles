export interface ConceptExercise {
  type: 'concept'
  title: string
  icon: string
  rule: string
  examples: { en: string; phonetic?: string; es: string }[]
  highlight?: string
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

export interface LessonContent {
  lessonNumber: number
  title: string
  subtitle: string
  colorFrom: string
  colorTo: string
  xpReward: number
  exercises: Exercise[]
}

const LESSONS: Record<number, LessonContent> = {
  1: {
    lessonNumber: 1,
    title: 'Cognates + -ing + IS/ARE',
    subtitle: 'La puerta de entrada al inglés',
    colorFrom: 'from-violet-600',
    colorTo: 'to-purple-500',
    xpReward: 50,
    exercises: [
      {
        type: 'concept',
        title: 'Palabras Iguales (Cognates)',
        icon: '🔗',
        rule: 'El inglés y el español comparten cientos de palabras. ¡Solo cambia la pronunciación!',
        examples: [
          { en: 'Animal',   phonetic: '(Ánimal)',    es: 'Animal' },
          { en: 'Control',  phonetic: '(contróUl)',  es: 'Control' },
          { en: 'Hospital', phonetic: '(jóspitAl)',  es: 'Hospital' },
          { en: 'Natural',  phonetic: '(náchural)',  es: 'Natural' },
          { en: 'General',  phonetic: '(yéneral)',   es: 'General' },
        ],
      },
      {
        type: 'multiple_choice',
        question: '¿Cuál de estas palabras NO es cognado inglés-español?',
        options: ['Animal', 'Hospital', 'Chair', 'Natural'],
        correct: 2,
        explanation: '"Chair" (silla) no tiene raíz latina. Las demás son idénticas en ambos idiomas.',
      },
      {
        type: 'word_match',
        instruction: 'Conecta la palabra con su pronunciación Ghio',
        pairs: [
          { left: 'Hospital', right: '(jóspitAl)' },
          { left: 'Control',  right: '(contróUl)' },
          { left: 'General',  right: '(yéneral)' },
          { left: 'Natural',  right: '(náchural)' },
        ],
      },
      {
        type: 'concept',
        title: 'La Terminación -ING',
        icon: '🔄',
        rule: 'Verbo + ING = acción que sucede en este momento. Se combina con AM, IS o ARE.',
        examples: [
          { en: 'working', phonetic: '(uérking)', es: 'trabajando' },
          { en: 'coming',  phonetic: '(cáming)',  es: 'viniendo' },
          { en: 'going',   phonetic: '(góUing)',  es: 'yendo' },
        ],
        highlight: 'AM / IS / ARE + verbo-ING = presente continuo',
      },
      {
        type: 'multiple_choice',
        question: 'Completa: "She ___ working right now"',
        options: ['am', 'is', 'are', 'be'],
        correct: 1,
        explanation: 'Con he / she / it usamos IS. Con I → AM. Con you / we / they → ARE.',
      },
      {
        type: 'sentence_builder',
        instruction: 'Construye: "Él está trabajando ahora"',
        answer: ['He', 'is', 'working', 'now'],
        tiles: ['He', 'is', 'working', 'now', 'are', 'go'],
      },
      {
        type: 'multiple_choice',
        question: '¿Cuál oración es correcta?',
        options: ['I are happy', 'She is happy', 'They is tired', 'He are here'],
        correct: 1,
        explanation: 'She → IS. I → AM. They / You / We → ARE.',
      },
    ],
  },

  2: {
    lessonNumber: 2,
    title: 'Los 16 Verbos Base',
    subtitle: 'Tu superpoder en inglés',
    colorFrom: 'from-blue-600',
    colorTo: 'to-cyan-500',
    xpReward: 60,
    exercises: [
      {
        type: 'concept',
        title: 'Los 16 Verbos Mágicos',
        icon: '⚡',
        rule: 'Estos 16 verbos reemplazan 4.000 verbos irregulares. Domínalos y dominas el inglés.',
        examples: [
          { en: 'come', phonetic: '(cám)',  es: 'venir' },
          { en: 'go',   phonetic: '(góU)',  es: 'ir' },
          { en: 'take', phonetic: '(téik)', es: 'tomar' },
          { en: 'make', phonetic: '(méik)', es: 'hacer' },
          { en: 'give', phonetic: '(guív)', es: 'dar' },
          { en: 'keep', phonetic: '(kíip)', es: 'mantener' },
        ],
      },
      {
        type: 'word_match',
        instruction: 'Conecta el verbo con su traducción',
        pairs: [
          { left: 'come', right: 'venir' },
          { left: 'take', right: 'tomar' },
          { left: 'give', right: 'dar' },
          { left: 'keep', right: 'mantener' },
        ],
      },
      {
        type: 'multiple_choice',
        question: '¿Cómo se conjuga "come" con he / she / it?',
        options: ['come', 'comes', 'coming', 'comed'],
        correct: 1,
        explanation: 'Con he / she / it los verbos en presente añaden -S: he comes, she takes, it gives.',
      },
      {
        type: 'concept',
        title: 'Futuro con WILL',
        icon: '🔮',
        rule: 'WILL + verbo infinitivo = futuro. WILL no cambia para ningún pronombre.',
        examples: [
          { en: 'I will come',    phonetic: '(Ai uíl cám)',  es: 'Yo vendré' },
          { en: 'She will go',    phonetic: '(shí uíl góU)', es: 'Ella irá' },
          { en: 'They will make', phonetic: '(déi uíl méik)',es: 'Ellos harán' },
        ],
        highlight: 'I will · You will · He will · She will · We will · They will',
      },
      {
        type: 'multiple_choice',
        question: 'Traduce: "Ella vendrá mañana"',
        options: [
          'She will come tomorrow',
          'She will comes tomorrow',
          'She comes will tomorrow',
          'She tomorrow will come',
        ],
        correct: 0,
        explanation: 'Orden: Sujeto + WILL + verbo base + complemento.',
      },
      {
        type: 'sentence_builder',
        instruction: 'Construye: "Yo tomaré el libro"',
        answer: ['I', 'will', 'take', 'the', 'book'],
        tiles: ['I', 'will', 'take', 'the', 'book', 'go', 'am'],
      },
    ],
  },

  3: {
    lessonNumber: 3,
    title: 'THE + WOULD + Plurales',
    subtitle: 'Artículos, condicional y números',
    colorFrom: 'from-emerald-600',
    colorTo: 'to-teal-500',
    xpReward: 60,
    exercises: [
      {
        type: 'concept',
        title: 'El Artículo THE',
        icon: '📌',
        rule: 'THE es el único artículo definido en inglés. Sirve para masculino, femenino y plural.',
        examples: [
          { en: 'the book',  phonetic: '(dA búk)',  es: 'el libro' },
          { en: 'the house', phonetic: '(dA jáUs)', es: 'la casa' },
          { en: 'the books', phonetic: '(dA búks)', es: 'los libros' },
        ],
        highlight: 'THE = el / la / los / las — todo en uno',
      },
      {
        type: 'multiple_choice',
        question: '¿Cómo se dice "las casas" en inglés?',
        options: ['a house', 'the house', 'the houses', 'house the'],
        correct: 2,
        explanation: 'THE + sustantivo en plural (-s). "The houses" = las casas.',
      },
      {
        type: 'concept',
        title: 'WOULD — Condicional',
        icon: '🤔',
        rule: 'WOULD + verbo = condicional (vendría, haría, daría). Como WILL, no cambia con ningún pronombre.',
        examples: [
          { en: 'I would come',  phonetic: '(Ai wúd cám)',  es: 'Yo vendría' },
          { en: 'She would take',phonetic: '(shí wúd téik)',es: 'Ella tomaría' },
        ],
        highlight: 'WILL = futuro seguro · WOULD = condicional / deseo',
      },
      {
        type: 'word_match',
        instruction: 'Forma el plural correcto',
        pairs: [
          { left: 'book',  right: 'books' },
          { left: 'house', right: 'houses' },
          { left: 'city',  right: 'cities' },
          { left: 'man',   right: 'men' },
        ],
      },
      {
        type: 'multiple_choice',
        question: '¿Cuál expresa un deseo o condición?',
        options: ['I will go', 'I would go', 'I am going', 'I go'],
        correct: 1,
        explanation: 'WOULD indica condicional: "yo iría (si pudiera/quisiera)". WILL es futuro concreto.',
      },
    ],
  },
}

function buildFallback(
  n: number,
  title: string,
  subtitle: string,
  colorFrom: string,
): LessonContent {
  return {
    lessonNumber: n,
    title,
    subtitle,
    colorFrom,
    colorTo: 'to-violet-500',
    xpReward: 60,
    exercises: [
      {
        type: 'concept',
        title,
        icon: '📚',
        rule: `Lección ${n} del Método Ghio — ${subtitle}. Próximamente más ejercicios interactivos.`,
        examples: [
          { en: 'come', phonetic: '(cám)',  es: 'venir' },
          { en: 'take', phonetic: '(téik)', es: 'tomar' },
          { en: 'give', phonetic: '(guív)', es: 'dar' },
        ],
      },
      {
        type: 'multiple_choice',
        question: '¿Qué significa "keep"?',
        options: ['dar', 'venir', 'mantener', 'tomar'],
        correct: 2,
        explanation: '"Keep" = mantener, guardar. Uno de los 16 verbos base del Método Ghio.',
      },
      {
        type: 'multiple_choice',
        question: '¿Cuál es correcto con "she"?',
        options: ['She come', 'She comes', 'She coming', 'She will comes'],
        correct: 1,
        explanation: 'Con he / she / it los verbos en presente simple añaden -S.',
      },
    ],
  }
}

const FALLBACKS: [number, string, string, string][] = [
  [4,  'Pasado + TO HAVE',          'Tiempo pasado y posesión',         'from-orange-600'],
  [5,  'TO BE + Presente Perfecto',  'Ser/estar y experiencias',         'from-rose-600'],
  [6,  'Imperativo + Horas',         'Órdenes y el reloj',               'from-pink-600'],
  [7,  'Pronombres + SOME/ANY',      'Me, him, her y cantidades',        'from-fuchsia-600'],
  [8,  'Comparativos + Negaciones',  'Más/menos y la negación',          'from-indigo-600'],
  [9,  'Preguntas + WH-words',       'Who, what, where, when, how',      'from-sky-600'],
  [10, 'Verbos Compuestos',          'Phrasal verbs esenciales',         'from-lime-600'],
  [11, 'Pronunciación + 850 Palabras','Sonidos y vocabulario completo',  'from-amber-600'],
]

for (const [n, title, subtitle, colorFrom] of FALLBACKS) {
  LESSONS[n] = buildFallback(n, title, subtitle, colorFrom)
}

export function getLessonContent(n: number): LessonContent {
  return LESSONS[n] ?? LESSONS[1]
}

export default LESSONS
