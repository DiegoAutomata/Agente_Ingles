import LessonClient from '@/features/lessons/components/LessonClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLessonContent } from '@/features/lessons/data/lesson-content'

export default async function ChallengePage() {
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

  const content = getLessonContent(lesson)

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-white">Desafío — L{lesson}</h1>
          <span className="badge badge-yellow">⚔️ 2× XP</span>
        </div>
        <p className="text-xs text-white/30 hidden sm:block">{content.subtitle}</p>
      </div>
      <LessonClient lessonNumber={lesson} mode="challenge" />
    </div>
  )
}
