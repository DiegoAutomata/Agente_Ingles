import LessonClient from '@/features/lessons/components/LessonClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function LessonPage() {
  let lesson = 1
  let league = 'bronce'
  let userId: string | undefined

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    userId = user.id

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('ghio_lesson, league')
      .eq('id', user.id)
      .single()

    if (error) throw error
    lesson = profile?.ghio_lesson ?? 1
    league = (profile as { league?: string } | null)?.league ?? 'bronce'
  } catch (error) { throw error }

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-white">Lección {lesson}</h1>
          <span className="badge badge-purple">Método Ghio</span>
        </div>
      </div>
      <LessonClient userId={userId} key={`${league}-${lesson}`} serverLesson={lesson} league={league} mode="lesson" />
    </div>
  )
}
