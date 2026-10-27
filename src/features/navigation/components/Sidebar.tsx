'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Inicio' },
  { href: '/conversation', icon: '🎙️', label: 'Conversar' },
  { href: '/vocabulary', icon: '🃏', label: 'Vocabulario' },
  { href: '/verb-drill', icon: '⚡', label: '16 Verbos' },
  { href: '/writing', icon: '✍️', label: 'Escritura' },
  { href: '/leaderboard', icon: '🏆', label: 'Ranking' },
  { href: '/profile', icon: '👤', label: 'Perfil' },
]

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    setLogoutError(null)
    try {
      const registration = await navigator.serviceWorker?.getRegistration()
      const subscription = await registration?.pushManager?.getSubscription()
      if (subscription) {
        const response = await fetch('/api/notifications/subscribe', { method: 'DELETE', headers: {'Content-Type':'application/json'}, body: JSON.stringify({endpoint: subscription.endpoint}) })
        if (!response.ok) throw new Error('No se pudo desvincular este dispositivo. Reintenta cerrar sesión.')
        await subscription.unsubscribe()
      }
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch {
      setLogoutError('No se pudo cerrar sesión. Verifica la conexión e inténtalo de nuevo.')
      return
    }
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-full md:w-56 shrink-0 flex flex-col border-b md:border-r border-white/5 p-3 md:sticky md:top-0 md:h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 py-3 mb-4">
        <span className="text-xl">🎓</span>
        <span className="font-bold text-white">Alex</span>
      </div>

      <button className="btn-ghost md:hidden" aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}>Menú</button>
      {/* Nav */}
      <nav id="main-navigation" aria-label="Navegación principal" className={`${open ? "block" : "hidden"} md:block flex-1 space-y-1`}>
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/20'
                  : 'text-white/50 hover:bg-white/5 hover:text-white/80'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className={`${open ? "block" : "hidden"} md:block mt-auto pt-3 border-t border-white/5`}>
        {logoutError && <p role="alert" className="text-red-300 text-sm">{logoutError}</p>}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
        >
          <span>🚪</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
