'use client'

import { useState, useEffect } from 'react'
import { usePushSubscription } from '../hooks/usePushSubscription'

interface Props {
  userId?: string
  autoShowDelay?: number
}

export function PushNotificationPrompt({ userId, autoShowDelay = 5000 }: Props) {
  const { isSupported, permission, isSubscribed, loading, error, subscribe } = usePushSubscription(userId)
  const [show, setShow] = useState(false)
  const configured = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()

  useEffect(() => { setShow(false) }, [userId])

  useEffect(() => {
    if (!userId || !configured || !isSupported || isSubscribed || permission === 'denied') {
      setShow(false)
      return
    }
    if (loading) return
    if (error) {
      setShow(true)
      return
    }
    try {
      if (localStorage.getItem(`push-prompt-dismissed:${userId}`) && !error) return
    } catch { /* Storage may be disabled; activation still works. */ }
    const timer = setTimeout(() => setShow(true), autoShowDelay)
    return () => clearTimeout(timer)
  }, [userId, configured, isSupported, isSubscribed, loading, permission, error, autoShowDelay])

  if (!userId || !configured || !show || isSubscribed) return null

  async function handleEnable() {
    if (await subscribe()) {
      try { localStorage.setItem(`push-prompt-dismissed:${userId}`, 'true') } catch { /* optional */ }
      setShow(false)
    }
  }

  function handleDismiss() {
    try { localStorage.setItem(`push-prompt-dismissed:${userId}`, 'true') } catch { /* optional */ }
    setShow(false)
  }

  return (
    <div className="fixed bottom-24 right-4 z-40 max-w-[280px] glass-card border-violet-500/30 p-4 shadow-xl shadow-black/40 rounded-2xl space-y-3 slide-up">
      <div className="flex items-start gap-2">
        <span className="text-xl shrink-0">🔔</span>
        <div>
          <p className="text-sm font-semibold text-white">¿Activar recordatorios?</p>
          <p className="text-xs text-white/50 mt-0.5 leading-relaxed">
            Alex te avisa cuando es hora de repasar para no perder tu racha.
          </p>
        </div>
      </div>
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
      <div className="flex gap-2">
        <button onClick={handleEnable} disabled={loading}
          className="flex-1 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors disabled:opacity-50">
          {loading ? 'Guardando…' : 'Activar'}
        </button>
        <button onClick={handleDismiss} disabled={loading}
          className="px-3 py-2 text-xs text-white/40 hover:text-white/60 transition-colors">
          Ahora no
        </button>
      </div>
    </div>
  )
}
