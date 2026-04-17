'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', icon: '🏠', label: 'Inicio' },
  { href: '/conversation', icon: '🎙️', label: 'Conversar' },
  { href: '/vocabulary', icon: '🃏', label: 'Vocabulario' },
  { href: '/verb-drill', icon: '⚡', label: '16 Verbos' },
  { href: '/writing', icon: '✍️', label: 'Escritura' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col border-r border-white/5 p-3 sticky top-0 h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 py-3 mb-4">
        <span className="text-xl">🎓</span>
        <span className="font-bold text-white">Alex</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
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
      <div className="mt-auto pt-3 border-t border-white/5">
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
