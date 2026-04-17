import FlashcardDeck, { type WordCard } from '@/features/vocabulary/components/FlashcardDeck'
import { createClient } from '@/lib/supabase/server'

const FALLBACK_WORDS: WordCard[] = [
  { id: 1,  word: 'to come',  phonetic: '(tu cám)',  translation: 'venir',             example_en: 'He comes every day.',           example_es: 'Él viene todos los días.',      isNew: true, isDue: false, interval: 1, repetitions: 0, easeFactor: 2.5 },
  { id: 2,  word: 'to let',   phonetic: '(tu let)',  translation: 'dejar / permitir',  example_en: 'Let me help you.',              example_es: 'Déjame ayudarte.',              isNew: true, isDue: false, interval: 1, repetitions: 0, easeFactor: 2.5 },
  { id: 3,  word: 'to go',    phonetic: '(tu góU)',  translation: 'ir',                example_en: 'We go to work every day.',      example_es: 'Vamos al trabajo todos los días.', isNew: true, isDue: false, interval: 1, repetitions: 0, easeFactor: 2.5 },
  { id: 4,  word: 'to put',   phonetic: '(tu put)',  translation: 'poner',             example_en: 'She puts the book on the table.', example_es: 'Ella pone el libro en la mesa.', isNew: true, isDue: false, interval: 1, repetitions: 0, easeFactor: 2.5 },
  { id: 5,  word: 'to take',  phonetic: '(tu téik)', translation: 'tomar / llevar',   example_en: 'I take the bus every morning.', example_es: 'Tomo el autobús cada mañana.',  isNew: true, isDue: false, interval: 1, repetitions: 0, easeFactor: 2.5 },
  { id: 6,  word: 'to give',  phonetic: '(tu guív)', translation: 'dar',              example_en: 'They give feedback after meetings.', example_es: 'Ellos dan feedback después de las reuniones.', isNew: true, isDue: false, interval: 1, repetitions: 0, easeFactor: 2.5 },
  { id: 7,  word: 'to get',   phonetic: '(tu guét)', translation: 'conseguir / obtener', example_en: 'I get the information you need.', example_es: 'Consigo la información que necesitas.', isNew: true, isDue: false, interval: 1, repetitions: 0, easeFactor: 2.5 },
  { id: 8,  word: 'to keep',  phonetic: '(tu kíip)', translation: 'mantener / guardar', example_en: 'Keep the document updated.',   example_es: 'Mantén el documento actualizado.', isNew: true, isDue: false, interval: 1, repetitions: 0, easeFactor: 2.5 },
  { id: 9,  word: 'to make',  phonetic: '(tu méik)', translation: 'hacer / crear',    example_en: 'We make a decision today.',     example_es: 'Tomamos una decisión hoy.',      isNew: true, isDue: false, interval: 1, repetitions: 0, easeFactor: 2.5 },
  { id: 10, word: 'to do',    phonetic: '(tu dúu)',  translation: 'hacer / realizar', example_en: 'What do you do for work?',      example_es: '¿Qué hacés para trabajar?',     isNew: true, isDue: false, interval: 1, repetitions: 0, easeFactor: 2.5 },
  { id: 11, word: 'to seem',  phonetic: '(tu síim)', translation: 'parecer',           example_en: 'It seems like a good idea.',    example_es: 'Parece una buena idea.',         isNew: true, isDue: false, interval: 1, repetitions: 0, easeFactor: 2.5 },
  { id: 12, word: 'to say',   phonetic: '(tu séi)',  translation: 'decir',            example_en: 'He says the project is ready.', example_es: 'Él dice que el proyecto está listo.', isNew: true, isDue: false, interval: 1, repetitions: 0, easeFactor: 2.5 },
  { id: 13, word: 'to see',   phonetic: '(tu síi)',  translation: 'ver',              example_en: 'I see what you mean.',          example_es: 'Veo lo que querés decir.',       isNew: true, isDue: false, interval: 1, repetitions: 0, easeFactor: 2.5 },
  { id: 14, word: 'to send',  phonetic: '(tu sénd)', translation: 'enviar',           example_en: 'Please send me the report.',    example_es: 'Por favor enviame el reporte.',  isNew: true, isDue: false, interval: 1, repetitions: 0, easeFactor: 2.5 },
  { id: 15, word: 'to be',    phonetic: '(tu bíi)',  translation: 'ser / estar',      example_en: 'I am ready for the meeting.',   example_es: 'Estoy listo para la reunión.',   isNew: true, isDue: false, interval: 1, repetitions: 0, easeFactor: 2.5 },
  { id: 16, word: 'to have',  phonetic: '(tu jáv)',  translation: 'tener / haber',    example_en: 'We have a meeting at 3 PM.',    example_es: 'Tenemos una reunión a las 3 PM.', isNew: true, isDue: false, interval: 1, repetitions: 0, easeFactor: 2.5 },
]

export default async function VocabularyPage() {
  let words: WordCard[] = FALLBACK_WORDS

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const [{ data: vocab }, { data: progress }] = await Promise.all([
      supabase
        .from('vocabulary')
        .select('id, word, phonetic, translation, example_en, example_es')
        .order('id'),
      user
        ? supabase
            .from('user_vocabulary')
            .select('word_id, srs_interval, srs_repetitions, srs_ease_factor, next_review_at')
            .eq('user_id', user.id)
        : Promise.resolve({ data: [] }),
    ])

    if (vocab && vocab.length > 0) {
      const now = new Date().toISOString()
      const progressMap = new Map(
        (progress ?? []).map(p => [p.word_id, p])
      )

      words = vocab.map(v => {
        const p = progressMap.get(v.id)
        const isNew = !p
        const isDue = p ? p.next_review_at <= now : false
        return {
          id: v.id,
          word: v.word,
          phonetic: v.phonetic,
          translation: v.translation,
          example_en: v.example_en,
          example_es: v.example_es,
          isNew,
          isDue,
          interval: p?.srs_interval ?? 1,
          repetitions: p?.srs_repetitions ?? 0,
          easeFactor: p?.srs_ease_factor ?? 2.5,
        }
      })
    }
  } catch {
    // Supabase no configurado — usa fallback local
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-white">Vocabulario SRS</h1>
          <span className="badge badge-green">SM-2 Algorithm</span>
        </div>
        <p className="text-sm text-white/40">
          Método Ghio — repaso espaciado inteligente.
        </p>
      </div>
      <FlashcardDeck words={words} />
    </div>
  )
}
