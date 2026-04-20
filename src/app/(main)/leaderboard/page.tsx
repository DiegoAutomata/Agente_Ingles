import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LEAGUES, getLeague } from '@/shared/constants/leagues'

interface LeaderboardRow {
  rank: number
  user_id: string
  username: string
  xp: number
  streak: number
  league: string
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ liga?: string }>
}) {
  let rows: LeaderboardRow[] = []
  let currentUserId: string | null = null
  let userLeague = 'bronce'
  const { liga } = await searchParams

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    currentUserId = user.id

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('league')
      .eq('id', user.id)
      .single()

    userLeague = profile?.league ?? 'bronce'
    const currentLeague = liga ?? userLeague

    const { data } = await supabase
      .rpc('get_leaderboard', { league_filter: currentLeague })

    rows = (data ?? []) as LeaderboardRow[]
  } catch { /* Supabase no configurado */ }

  const displayLeague = liga ?? userLeague
  const league = getLeague(displayLeague)

  const rankColors: Record<number, string> = {
    1: 'text-yellow-400',
    2: 'text-slate-300',
    3: 'text-orange-400',
  }
  const rankBadges: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Ranking</h1>
        <p className="text-white/40 text-sm mt-1">Top 50 de la liga {league.icon} {league.name}</p>
      </div>

      {/* Selector de liga */}
      <div className="flex flex-wrap gap-2">
        {LEAGUES.map(l => (
          <a
            key={l.id}
            href={`/leaderboard?liga=${l.id}`}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              l.id === displayLeague
                ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                : 'text-white/40 border-white/10 hover:text-white/70 hover:border-white/20'
            }`}
          >
            {l.icon} {l.name}
          </a>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="glass-card p-8 text-center text-white/40">
          <p className="text-3xl mb-2">🏆</p>
          <p>Aún no hay usuarios en esta liga.</p>
          <p className="text-sm mt-1">¡Sé el primero en llegar!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const isMe = row.user_id === currentUserId
            const rank = Number(row.rank)
            return (
              <div
                key={row.user_id}
                className={`glass-card p-4 flex items-center gap-4 transition-all ${
                  isMe ? 'border-violet-500/40 bg-violet-500/5' : ''
                }`}
              >
                {/* Rank */}
                <div className={`w-8 text-center shrink-0 font-bold text-lg ${rankColors[rank] ?? 'text-white/30'}`}>
                  {rankBadges[rank] ?? `#${rank}`}
                </div>

                {/* Avatar placeholder */}
                <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-sm shrink-0">
                  {row.username?.charAt(0)?.toUpperCase() ?? '?'}
                </div>

                {/* Name + streak */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isMe ? 'text-violet-300' : 'text-white'}`}>
                    {row.username ?? 'Anónimo'} {isMe && <span className="text-xs text-violet-400">(tú)</span>}
                  </p>
                  {row.streak > 0 && (
                    <p className="text-xs text-white/40 mt-0.5">🔥 {row.streak}d racha</p>
                  )}
                </div>

                {/* XP */}
                <div className="text-right shrink-0">
                  <p className="font-bold text-yellow-400">{row.xp.toLocaleString()}</p>
                  <p className="text-xs text-white/30">XP</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
