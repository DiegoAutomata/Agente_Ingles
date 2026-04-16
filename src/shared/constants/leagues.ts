export const LEAGUES = [
  { id: 'bronce',       name: 'Bronce',       icon: '🥉', color: '#cd7f32', levels: 11 },
  { id: 'plata',        name: 'Plata',        icon: '🥈', color: '#c0c0c0', levels: 10 },
  { id: 'oro',          name: 'Oro',          icon: '🥇', color: '#ffd700', levels: 10 },
  { id: 'diamante',     name: 'Diamante',     icon: '💎', color: '#7dd3fc', levels: 10 },
  { id: 'maestro',      name: 'Maestro',      icon: '👑', color: '#a855f7', levels: 10 },
  { id: 'gran_maestro', name: 'Gran Maestro', icon: '🏆', color: '#ef4444', levels: 10 },
] as const

export type LeagueId = typeof LEAGUES[number]['id']

export function getLeague(id: string) {
  return LEAGUES.find(l => l.id === id) ?? LEAGUES[0]
}
