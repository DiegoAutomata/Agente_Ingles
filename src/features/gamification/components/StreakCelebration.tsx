'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'streak_prev'

export default function StreakCelebration({ streak }: { streak: number }) {
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (streak <= 0) return

    const prev = parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10)

    if (streak > prev) {
      setVisible(true)
      setFading(false)

      const fadeTimer = setTimeout(() => setFading(true), 700)
      const hideTimer = setTimeout(() => {
        setVisible(false)
        setFading(false)
      }, 1000)

      localStorage.setItem(STORAGE_KEY, String(streak))

      return () => {
        clearTimeout(fadeTimer)
        clearTimeout(hideTimer)
      }
    } else {
      localStorage.setItem(STORAGE_KEY, String(streak))
    }
  }, [streak])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/40" />
      <div className={`relative flex flex-col items-center gap-2 ${fading ? 'streak-fade' : 'streak-pop'}`}>
        <span className="text-[10rem] leading-none select-none drop-shadow-[0_0_40px_rgba(251,146,60,0.8)]">
          🔥
        </span>
        <span className="text-8xl font-black text-orange-400 drop-shadow-[0_0_20px_rgba(251,146,60,0.9)]">
          {streak}
        </span>
        <span className="text-2xl font-bold text-white/90 tracking-widest uppercase">
          ¡Racha!
        </span>
      </div>
    </div>
  )
}
