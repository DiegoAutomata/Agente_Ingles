import LessonClient from '@/features/lessons/components/LessonClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ChallengePage() {
  let lesson = 1
  let league = 'bronce'

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ghio_lesson, league')
      .eq('id', user.id)
      .single()

    lesson = profile?.ghio_lesson ?? 1
    league = (profile as { league?: string } | null)?.league ?? 'bronce'
  } catch {
    // Supabase no configurado — usa defaults
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-white">Desafío — L{lesson}</h1>
          <span className="badge badge-yellow">⚔️ 2× XP</span>
        </div>
      </div>
      <LessonClient serverLesson={lesson} league={league} mode="challenge" />
    </div>
  )
}
