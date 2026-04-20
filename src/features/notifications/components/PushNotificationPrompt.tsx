'use client'

import { useState, useEffect } from 'react'
import { usePushSubscription } from '../hooks/usePushSubscription'

interface Props {
  userId?: string
  autoShowDelay?: number
}

export function PushNotificationPrompt({ userId, autoShowDelay = 5000 }: Props) {
  const { isSupported, permission, isSubscribed, subscribe } = usePushSubscription(userId)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!isSupported || isSubscribed || permission === 'denied') return
    const dismissed = localStorage.getItem('push-prompt-dismissed')
    if (dismissed) return
    const timer = setTimeout(() => setShow(true), autoShowDelay)
    return () => clearTimeout(timer)
  }, [isSupported, isSubscribed, permission, autoShowDelay])

  if (!show) return null

  async function handleEnable() {
    localStorage.setItem('push-prompt-dismissed', 'true')
    await subscribe()
    setShow(false)
  }

  function handleDismiss() {
    localStorage.setItem('push-prompt-dismissed', 'true')
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
      <div className="flex gap-2">
        <button
          onClick={handleEnable}
          className="flex-1 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors"
        >
          Activar
        </button>
        <button
          onClick={handleDismiss}
          className="px-3 py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          Ahora no
        </button>
      </div>
    </div>
  )
}
