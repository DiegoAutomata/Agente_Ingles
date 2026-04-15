import TutorChat from '@/features/tutor/components/TutorChat'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const LESSON_INTRO: Record<number, string> = {
  1: `Welcome to **Lesson 1 of the Ghio Method**! 🎉

Today we start with the smartest shortcut in English: **words that are the same in English and Spanish** — just with different pronunciation!

**First, learn these pronunciation rules:**
• Letters in CAPITALS = pronounce softly (almost silent)
• Accented letters = pronounce strongly
• SH = like in "Washington"

Let's start! Here are your first 10 cognate words:
1. Animal (Ánimal) = Animal
2. Control (contróUl) = Control
3. Hospital (jóspitAl) = Hospital
4. General (yéneral) = General
5. Natural (náchural) = Natural

**Your turn:** Can you read these 5 words out loud? Then I'll teach you the -ing termination!`,

  2: `Welcome to **Lesson 2** — the most important lesson in this entire course! 🌟

Today you'll learn the **16 Basic Verbs** that replace 4,000 irregular English verbs. These 16 verbs are your superpower.

Let's start with the first 4:
1. **To come** (tu cám) = Venir → I come, You come, He *comes*
2. **To go** (tu góU) = Ir → I go, You go, He *goes*
3. **To be** (tu bíi) = Ser/Estar → I *am*, You *are*, He *is*
4. **To have** (tu jáv) = Tener → I have, You have, He *has*

Notice: with he/she/it — most verbs add **-s** (comes, goes). But BE and HAVE are special!

**Exercise:** Translate: "Él tiene un libro. Ella va al trabajo. Nosotros venemos mañana."`,
}

export default async function LessonPage() {
  let lesson = 1

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ghio_lesson')
      .eq('id', user.id)
      .single()

    lesson = profile?.ghio_lesson ?? 1
  } catch {
    // Supabase no configurado — usa defaults
  }
  const intro = LESSON_INTRO[lesson] || `Welcome to **Lesson ${lesson}**! Let's continue with the Ghio method. I'll guide you through today's content step by step.`

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-white">Lección {lesson}</h1>
            <span className="badge badge-purple">Método Ghio</span>
          </div>
          <p className="text-sm text-white/40">
            {lesson === 1 && 'Cognates + Terminación -ing + IS/ARE'}
            {lesson === 2 && 'Los 16 Verbos Básicos + Tiempo Presente + Futuro'}
            {lesson > 2 && `Lección ${lesson} del curriculum Ghio`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/30">Progreso Ghio</div>
          <div className="text-sm font-semibold text-violet-400">{lesson}/11</div>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <TutorChat
          mode="lesson"
          initialMessage={intro}
          placeholder="Responde los ejercicios o haz preguntas..."
        />
      </div>
    </div>
  )
}
