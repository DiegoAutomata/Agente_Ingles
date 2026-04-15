import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const GHIO_LESSONS = [
  { n: 1, title: 'Cognates + -ing + IS/ARE', topics: ['50 palabras iguales en inglés y español', 'Terminación -ing', 'IS y ARE'] },
  { n: 2, title: 'Los 16 Verbos + Presente + Futuro', topics: ['Pronombres personales', '16 verbos básicos', 'Tiempo presente', 'Futuro con WILL'] },
  { n: 3, title: 'THE + WOULD + Plurales', topics: ['Artículo THE', 'WOULD y MAY', 'Plurales', 'Números'] },
  { n: 4, title: 'Pasado + TO HAVE', topics: ['Tiempo pasado (-ed)', 'DO vs MAKE', 'TO HAVE completo'] },
  { n: 5, title: 'TO BE + Presente Perfecto', topics: ['TO BE completo', 'Terminación -er/-or', 'Presente perfecto'] },
  { n: 6, title: 'Imperativo + Horas', topics: ['Modo imperativo', 'Las horas', 'THIS/THAT/THESE/THOSE'] },
  { n: 7, title: 'Pronombres + SOME/ANY', topics: ['Pronombres objeto', 'HERE y THERE', 'SOME y ANY', 'Posesivos'] },
  { n: 8, title: 'Comparativos + Negaciones', topics: ['Comparativos', 'Negaciones en todos los tiempos'] },
  { n: 9, title: 'Preguntas + WH-words', topics: ['Interrogación inglesa', 'WHO/WHICH/WHERE/WHEN/WHAT/WHY/HOW', 'THERE IS/ARE'] },
  { n: 10, title: 'Verbos Compuestos + Preposiciones', topics: ['Combinaciones verbales', 'Preposiciones', 'Phrasal verbs'] },
  { n: 11, title: 'Pronunciación + 850 Palabras', topics: ['Sonidos difíciles', 'Alfabeto inglés', 'Vocabulario A-Z completo'] },
]

const QUICK_ACTIONS = [
  { href: '/conversation', icon: '🎙️', label: 'Conversar', desc: 'Practica hablando libremente' },
  { href: '/verb-drill', icon: '⚡', label: '16 Verbos', desc: 'Drill intensivo de los verbos base' },
  { href: '/vocabulary', icon: '🃏', label: 'Vocabulario', desc: 'Repaso SRS de tus palabras' },
  { href: '/writing', icon: '✍️', label: 'Escribir', desc: 'Email o texto con corrección' },
]

export default async function DashboardPage() {
  let profile = null
  let learnerProfile: Record<string, unknown> | null = null
  let userEmail: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')
    userEmail = user.email ?? null

    const [profileRes, learnerRes] = await Promise.all([
      supabase.from('user_profiles').select('ghio_lesson, module, xp, streak, last_session_at').eq('id', user.id).single(),
      supabase.from('learner_profile').select('profile_json').eq('user_id', user.id).single(),
    ])

    profile = profileRes.data
    learnerProfile = learnerRes.data?.profile_json as Record<string, unknown> | null
  } catch {
    // Supabase no configurado — muestra el dashboard sin datos reales
  }

  const currentLesson = profile?.ghio_lesson ?? 1
  const xp = profile?.xp ?? 0
  const streak = profile?.streak ?? 0
  const weaknesses = (learnerProfile?.weaknesses as string[]) ?? []
  const lastWeekSummary = learnerProfile?.last_week_summary as string | null

  const lessonProgress = ((currentLesson - 1) / 11) * 100

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Hola,{' '}
          <span className="gradient-text">{userEmail?.split('@')[0] ?? 'alumno'}</span> 👋
        </h1>
        <p className="text-white/40 text-sm mt-1">
          {streak > 0 ? `${streak} días seguidos aprendiendo. ¡No pares!` : 'Empecemos la racha hoy.'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Racha', value: `${streak}d`, icon: '🔥', color: 'text-orange-400' },
          { label: 'XP Total', value: xp.toLocaleString(), icon: '⭐', color: 'text-yellow-400' },
          { label: 'Lección', value: `${currentLesson}/11`, icon: '📚', color: 'text-violet-400' },
        ].map(stat => (
          <div key={stat.label} className="glass-card p-4 text-center">
            <div className="text-xl mb-1">{stat.icon}</div>
            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-white/40 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Progreso Ghio */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Progreso Método Ghio</h2>
          <span className="badge badge-purple">L{currentLesson}/11</span>
        </div>
        <div className="progress-bar mb-4">
          <div className="progress-fill" style={{ width: `${lessonProgress}%` }} />
        </div>
        <div className="grid grid-cols-11 gap-1">
          {GHIO_LESSONS.map(lesson => (
            <div
              key={lesson.n}
              title={lesson.title}
              className={`h-2 rounded-full transition-all ${
                lesson.n < currentLesson
                  ? 'bg-violet-500'
                  : lesson.n === currentLesson
                  ? 'bg-violet-500/60 animate-pulse'
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>
        <div className="mt-4">
          <Link
            href="/lesson"
            className="btn-primary text-sm py-2.5 px-4 inline-flex"
          >
            📚 Continuar Lección {currentLesson}: {GHIO_LESSONS[currentLesson - 1]?.title}
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-semibold text-white mb-3">Acción rápida</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(action => (
            <Link
              key={action.href}
              href={action.href}
              className="glass-card glass-card-hover p-4 text-center"
            >
              <div className="text-2xl mb-2">{action.icon}</div>
              <div className="font-medium text-white text-sm">{action.label}</div>
              <div className="text-xs text-white/40 mt-0.5">{action.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Alex te dice */}
      {(weaknesses.length > 0 || lastWeekSummary) && (
        <div className="glass-card p-5 border-violet-500/20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
              🎓
            </div>
            <div>
              <p className="text-sm font-semibold text-white mb-1">Alex dice:</p>
              {lastWeekSummary && (
                <p className="text-sm text-white/60 mb-2">{lastWeekSummary}</p>
              )}
              {weaknesses.length > 0 && (
                <p className="text-sm text-white/60">
                  <span className="text-yellow-400">Foco de hoy:</span>{' '}
                  {weaknesses.slice(0, 2).join(' y ')}.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
