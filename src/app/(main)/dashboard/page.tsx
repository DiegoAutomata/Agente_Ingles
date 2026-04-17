import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import StreakCelebration from '@/features/gamification/components/StreakCelebration'
import { getLeague, LEAGUES } from '@/shared/constants/leagues'

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
      supabase.from('user_profiles').select('ghio_lesson, module, xp, streak, last_session_at, league').eq('id', user.id).single(),
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
  const leagueId = (profile as Record<string, unknown> | null)?.league as string ?? 'bronce'
  const league = getLeague(leagueId)
  const maxLevels = league.levels
  const weaknesses = (learnerProfile?.weaknesses as string[]) ?? []
  const lastWeekSummary = learnerProfile?.last_week_summary as string | null

  const lessonProgress = ((currentLesson - 1) / maxLevels) * 100

  // Lección actual (para Bronce usa GHIO_LESSONS, otras ligas muestran "Nivel N")
  const currentLessonTitle = leagueId === 'bronce'
    ? GHIO_LESSONS[(currentLesson - 1) % 11]?.title ?? ''
    : `Nivel ${currentLesson}`

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
          { label: 'Liga', value: `${league.icon} ${league.name}`, icon: '', color: 'text-violet-400' },
        ].map(stat => (
          <div key={stat.label} className="glass-card p-4 text-center">
            {stat.icon && <div className="text-xl mb-1">{stat.icon}</div>}
            <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-white/40 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tu Progreso */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Tu Progreso</h2>
          <span className="badge badge-purple">
            {league.icon} L{currentLesson}/{maxLevels} · {league.name}
          </span>
        </div>

        {/* Liga path visual */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          {LEAGUES.map((l, i) => {
            const isActive = l.id === leagueId
            const isPast = LEAGUES.findIndex(x => x.id === leagueId) > i
            return (
              <div key={l.id} className="flex items-center gap-1 shrink-0">
                <span
                  className={`text-lg transition-all ${
                    isActive ? 'opacity-100 scale-110' : isPast ? 'opacity-60' : 'opacity-20'
                  }`}
                  title={l.name}
                >
                  {l.icon}
                </span>
                {i < LEAGUES.length - 1 && (
                  <div className={`w-6 h-0.5 rounded-full ${isPast || isActive ? 'bg-violet-500' : 'bg-white/10'}`} />
                )}
              </div>
            )
          })}
        </div>

        <div className="progress-bar mb-4">
          <div className="progress-fill" style={{ width: `${lessonProgress}%` }} />
        </div>

        <div className="grid gap-1 mb-4" style={{ gridTemplateColumns: `repeat(${maxLevels}, 1fr)` }}>
          {Array.from({ length: maxLevels }).map((_, i) => {
            const n = i + 1
            return (
              <div
                key={n}
                title={leagueId === 'bronce' ? GHIO_LESSONS[i]?.title : `Nivel ${n}`}
                className={`h-2 rounded-full transition-all ${
                  n < currentLesson
                    ? 'bg-violet-500'
                    : n === currentLesson
                    ? 'bg-violet-500/60 animate-pulse'
                    : 'bg-white/10'
                }`}
              />
            )
          })}
        </div>

        <div className="mt-4">
          <Link href="/lesson" className="btn-primary text-sm py-2.5 px-4 inline-flex">
            📚 Continuar L{currentLesson}: {currentLessonTitle}
          </Link>
        </div>
      </div>

      {/* Modo Desafío */}
      <div>
        <h2 className="font-semibold text-white mb-3">Modo Desafío</h2>
        <Link href="/challenge" className="glass-card glass-card-hover p-5 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center text-2xl shrink-0">
            ⚔️
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-semibold text-white">Desafío</p>
              <span className="badge badge-yellow">2× XP</span>
            </div>
            <p className="text-sm text-white/50">3 vidas · error = pierdes una · se recargan en 4h</p>
          </div>
          <span className="text-white/30 group-hover:text-red-400 transition-colors text-xl shrink-0">→</span>
        </Link>
      </div>

      {/* Puzzles */}
      <div>
        <h2 className="font-semibold text-white mb-3">Puzzles</h2>
        <Link href="/puzzle" className="glass-card glass-card-hover p-5 flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-2xl shrink-0">
            🧩
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white">Word Scramble</p>
            <p className="text-sm text-white/50 mt-0.5">Ordena las letras y formá la palabra correcta en inglés</p>
          </div>
          <span className="text-white/30 group-hover:text-violet-400 transition-colors text-xl shrink-0">→</span>
        </Link>
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

      <StreakCelebration streak={streak} />
    </div>
  )
}
