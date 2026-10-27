import Link from 'next/link'
import { redirect } from 'next/navigation'
import FlashcardDeck, { type WordCard } from '@/features/vocabulary/components/FlashcardDeck'
import { createClient } from '@/lib/supabase/server'

export default async function VocabularyPage() {
  let words: WordCard[] = []
  let loadError: string | null = null
  let needsLogin = false

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user) {
      needsLogin = true
    } else if (authError) {
      throw authError
    } else {
      const [vocabulary, progress] = await Promise.all([
        supabase
          .from('vocabulary')
          .select('id, word, phonetic, translation, example_en, example_es')
          .order('id'),
        supabase
          .from('user_vocabulary')
          .select('word_id, srs_interval, srs_repetitions, srs_ease_factor, next_review_at')
          .eq('user_id', user.id),
      ])
      if (vocabulary.error) throw vocabulary.error
      if (progress.error) throw progress.error
      if (!vocabulary.data || !progress.data) throw new Error('Incomplete vocabulary response')

      // Server request time determines which reviews are due; this is not a client render.
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now()
      const progressMap = new Map(progress.data.map(p => [p.word_id, p]))
      words = vocabulary.data.map(v => {
        const p = progressMap.get(v.id)
        return {
          id: v.id,
          word: v.word,
          phonetic: v.phonetic,
          translation: v.translation,
          example_en: v.example_en,
          example_es: v.example_es,
          isNew: !p,
          isDue: p ? Date.parse(p.next_review_at) <= now : false,
          interval: p?.srs_interval ?? 1,
          repetitions: p?.srs_repetitions ?? 0,
          easeFactor: p?.srs_ease_factor ?? 2.5,
        }
      })
    }
  } catch {
    loadError = 'No se pudo cargar el vocabulario y tu progreso. Volvé a intentarlo.'
  }

  if (needsLogin) redirect('/login?next=/vocabulary')

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-6 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-white">Vocabulario SRS</h1>
          <span className="badge badge-green">Repaso espaciado</span>
        </div>
        <p className="text-sm text-white/40">Palabras nuevas y repasos pendientes para hoy.</p>
      </div>
      {loadError ? (
        <div role="alert" className="glass-card m-6 p-6 space-y-4">
          <p className="text-red-200">{loadError}</p>
          <a href="/vocabulary" className="btn-primary">Volver a cargar</a>
          <Link href="/dashboard" className="btn-ghost">Volver al inicio</Link>
        </div>
      ) : <FlashcardDeck words={words} />}
    </div>
  )
}
