import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getLeague } from '@/shared/constants/leagues'

const ERROR_TYPE_LABELS: Record<string, string> = {
  grammar: 'Gramática',
  vocabulary: 'Vocabulario',
  pronunciation: 'Pronunciación',
  syntax: 'Sintaxis',
}

const ERROR_TYPE_COLORS: Record<string, string> = {
  grammar: 'text-red-400 bg-red-500/10 border-red-500/20',
  vocabulary: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  pronunciation: 'text-green-400 bg-green-500/10 border-green-500/20',
  syntax: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
}

const MODE_LABELS: Record<string, string> = {
  conversation: '🎙️ Conversación',
  writing: '✍️ Escritura',
  lesson: '📚 Lección',
  verb_drill: '⚡ Verbos',
  vocabulary: '🃏 Vocabulario',
}

export default async function ProfilePage() {
  let profile = null
  let learnerProfile: Record<string, unknown> | null = null
  let recentSessions: Array<{ id: string; mode: string; created_at: string }> = []
  let recentErrors: Array<{ error_type: string; pattern: string; user_attempt: string; correct_form: string; created_at: string }> = []
  let recentWriting: Array<{ score: number; user_text: string; ai_feedback: string; created_at: string }> = []
  let userEmail: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    userEmail = user.email ?? null

    const [profileRes, learnerRes, sessionsRes, errorsRes, writingRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', user.id).single(),
      supabase.from('learner_profile').select('profile_json').eq('user_id', user.id).single(),
      supabase.from('conversations').select('id, mode, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('error_log').select('error_type, pattern, user_attempt, correct_form, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(15),
      supabase.from('writing_submissions').select('score, user_text, ai_feedback, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    ])

    profile = profileRes.data
    learnerProfile = learnerRes.data?.profile_json as Record<string, unknown> | null
    recentSessions = sessionsRes.data ?? []
    recentErrors = errorsRes.data ?? []
    recentWriting = writingRes.data ?? []
  } catch { /* Supabase no configurado */ }

  const xp = profile?.xp ?? 0
  const streak = profile?.streak ?? 0
  const leagueId = profile?.league ?? 'bronce'
  const league = getLeague(leagueId)
  const currentLesson = profile?.ghio_lesson ?? 1
  const sessionCount = (learnerProfile?.session_count as number) ?? 0
  const weaknesses = (learnerProfile?.weaknesses as string[]) ?? []
  const strengths = (learnerProfile?.strengths as string[]) ?? []
  const focusAreas = (learnerProfile?.focus_areas as string[]) ?? []
  const lastWeekSummary = learnerProfile?.last_week_summary as string | null

  const errorTypeCounts: Record<string, number> = {}
  for (const e of recentErrors) {
    errorTypeCounts[e.error_type] = (errorTypeCounts[e.error_type] ?? 0) + 1
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-2xl">
            {league.icon}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{userEmail?.split('@')[0] ?? 'alumno'}</h1>
            <p className="text-white/40 text-sm">{userEmail}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="badge badge-purple">{league.icon} {league.name} · L{currentLesson}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'XP Total', value: xp.toLocaleString(), icon: '⭐', color: 'text-yellow-400' },
            { label: 'Racha actual', value: `${streak}d`, icon: '🔥', color: 'text-orange-400' },
            { label: 'Sesiones', value: String(sessionCount), icon: '📊', color: 'text-violet-400' },
          ].map(s => (
            <div key={s.label} className="text-center p-3 rounded-xl bg-white/5">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-white/30 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen de Alex */}
      {(lastWeekSummary || focusAreas.length > 0) && (
        <div className="glass-card p-5 border-violet-500/20">
          <p className="text-xs text-white/30 uppercase tracking-wider mb-3">🎓 Alex dice</p>
          {lastWeekSummary && (
            <p className="text-sm text-white/70 mb-3">{lastWeekSummary}</p>
          )}
          {focusAreas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {focusAreas.map((area, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300">
                  🎯 {area}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fortalezas y debilidades */}
      {(strengths.length > 0 || weaknesses.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {strengths.length > 0 && (
            <div className="glass-card p-4">
              <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-3">✅ Fortalezas</p>
              <ul className="space-y-1.5">
                {strengths.map((s, i) => (
                  <li key={i} className="text-white/60 text-sm">• {s}</li>
                ))}
              </ul>
            </div>
          )}
          {weaknesses.length > 0 && (
            <div className="glass-card p-4">
              <p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-3">⚠️ Áreas a mejorar</p>
              <ul className="space-y-1.5">
                {weaknesses.map((w, i) => (
                  <li key={i} className="text-white/60 text-sm">• {w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Errores más comunes */}
      {recentErrors.length > 0 && (
        <div className="glass-card p-5">
          <p className="text-xs text-white/30 uppercase tracking-wider mb-4">
            Últimos errores ({recentErrors.length})
          </p>

          {/* Resumen por tipo */}
          {Object.keys(errorTypeCounts).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(errorTypeCounts).map(([type, count]) => (
                <span
                  key={type}
                  className={`text-xs px-2.5 py-1 rounded-lg border ${ERROR_TYPE_COLORS[type] ?? 'text-white/50 bg-white/5 border-white/10'}`}
                >
                  {ERROR_TYPE_LABELS[type] ?? type}: {count}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {recentErrors.slice(0, 8).map((err, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-t border-white/5">
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded border mt-0.5 ${ERROR_TYPE_COLORS[err.error_type] ?? 'text-white/30 border-white/10'}`}>
                  {ERROR_TYPE_LABELS[err.error_type] ?? err.error_type}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm line-through text-white/40">"{err.user_attempt}"</span>
                    <span className="text-white/20 text-xs">→</span>
                    <span className="text-sm text-green-300">"{err.correct_form}"</span>
                  </div>
                  {err.pattern && (
                    <p className="text-xs text-white/30 mt-0.5 truncate">{err.pattern}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de sesiones */}
      {recentSessions.length > 0 && (
        <div className="glass-card p-5">
          <p className="text-xs text-white/30 uppercase tracking-wider mb-4">Últimas sesiones</p>
          <div className="space-y-2">
            {recentSessions.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-t border-white/5">
                <span className="text-sm text-white/60">{MODE_LABELS[s.mode] ?? s.mode}</span>
                <span className="text-xs text-white/30">
                  {new Date(s.created_at).toLocaleDateString('es-AR', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial de escritura */}
      {recentWriting.length > 0 && (
        <div className="glass-card p-5">
          <p className="text-xs text-white/30 uppercase tracking-wider mb-4">Últimas correcciones de escritura</p>
          <div className="space-y-4">
            {recentWriting.map((w, i) => {
              const scoreColor = w.score >= 8 ? 'text-green-400' : w.score >= 6 ? 'text-yellow-400' : 'text-red-400'
              return (
                <div key={i} className="border-t border-white/5 pt-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm text-white/70 line-clamp-2">{w.user_text.slice(0, 120)}…</p>
                    <span className={`shrink-0 text-lg font-bold ${scoreColor}`}>{w.score}<span className="text-xs text-white/20">/10</span></span>
                  </div>
                  {w.ai_feedback && (
                    <p className="text-xs text-white/40">{w.ai_feedback}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Estado vacío (primeras sesiones) */}
      {recentSessions.length === 0 && recentErrors.length === 0 && (
        <div className="glass-card p-8 text-center text-white/40">
          <p className="text-3xl mb-3">📊</p>
          <p className="font-medium text-white/60">Tu perfil se completa con el uso</p>
          <p className="text-sm mt-1">Haz una sesión de conversación o escritura y Alex comenzará a registrar tu progreso.</p>
        </div>
      )}
    </div>
  )
}
