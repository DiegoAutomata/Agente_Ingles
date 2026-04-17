'use client'

import { useState, useEffect } from 'react'

const MAX_LIVES = 3
const RECHARGE_MS = 4 * 60 * 60 * 1000 // 4 hours
const STORAGE_KEY = 'challenge_lives'

interface StoredLives {
  count: number
  lastRecharge: number
}

export function useLives(enabled: boolean) {
  const [lives, setLives] = useState(MAX_LIVES)
  const [nextRechargeAt, setNextRechargeAt] = useState<number | null>(null)

  useEffect(() => {
    if (!enabled) return
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return

    const stored: StoredLives = JSON.parse(raw)
    const now = Date.now()
    const recharged = Math.floor((now - stored.lastRecharge) / RECHARGE_MS)
    const newCount = Math.min(MAX_LIVES, stored.count + recharged)
    const newLastRecharge = stored.lastRecharge + recharged * RECHARGE_MS

    setLives(newCount)
    if (newCount < MAX_LIVES) setNextRechargeAt(newLastRecharge + RECHARGE_MS)

    if (newCount !== stored.count) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ count: newCount, lastRecharge: newLastRecharge }),
      )
    }
  }, [enabled])

  function loseLife(): number {
    const raw = localStorage.getItem(STORAGE_KEY)
    const stored: StoredLives = raw
      ? JSON.parse(raw)
      : { count: lives, lastRecharge: Date.now() }

    const newCount = Math.max(0, stored.count - 1)
    // Start recharge clock the moment we drop below max
    const newLastRecharge =
      stored.count === MAX_LIVES ? Date.now() : stored.lastRecharge

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ count: newCount, lastRecharge: newLastRecharge }),
    )
    setLives(newCount)
    if (newCount < MAX_LIVES) setNextRechargeAt(newLastRecharge + RECHARGE_MS)
    return newCount
  }

  return { lives, loseLife, nextRechargeAt }
}
