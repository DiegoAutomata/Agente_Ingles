'use client'
import { useState, useEffect, useRef } from 'react'

const MAX_LIVES = 3
const RECHARGE_MS = 4 * 60 * 60 * 1000
interface StoredLives { count: number; lastRecharge: number }

function recharged(stored: StoredLives, now: number): StoredLives {
  const elapsed = Math.max(0, Math.floor((now - stored.lastRecharge) / RECHARGE_MS))
  return { count: Math.min(MAX_LIVES, stored.count + elapsed), lastRecharge: stored.lastRecharge + elapsed * RECHARGE_MS }
}

function read(key: string, fallback: StoredLives): StoredLives {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null')
    if (value && typeof value === 'object' && 'count' in value && 'lastRecharge' in value &&
      typeof value.count === 'number' && Number.isInteger(value.count) && value.count >= 0 && value.count <= 3 &&
      typeof value.lastRecharge === 'number' && Number.isFinite(value.lastRecharge) && value.lastRecharge <= Date.now()) return value as StoredLives
  } catch { /* Disabled or corrupt storage uses in-memory state. */ }
  return fallback
}

export function useLives(enabled: boolean, userId = 'local') {
  const [lives, setLives] = useState(MAX_LIVES)
  const [nextRechargeAt, setNextRechargeAt] = useState<number | null>(null)
  const memory = useRef<StoredLives>({ count: MAX_LIVES, lastRecharge: 0 })
  const key = `challenge_lives:${userId}`

  function publish(value: StoredLives) {
    memory.current = value
    setLives(value.count)
    setNextRechargeAt(value.count < MAX_LIVES ? value.lastRecharge + RECHARGE_MS : null)
    try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Optional browser storage. */ }
  }

  useEffect(() => {
    if (!enabled) return
    memory.current = {count: MAX_LIVES,lastRecharge: Date.now()}
    const update = () => publish(recharged(read(key,memory.current),Date.now()))
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
    // key scopes storage and the effect lifetime to the current account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key])

  function loseLife(): number {
    const now = Date.now()
    const current = recharged(read(key,memory.current),now)
    const value = {count: Math.max(0,current.count-1),lastRecharge: current.count === MAX_LIVES ? now : current.lastRecharge}
    publish(value)
    return value.count
  }
  return { lives, loseLife, nextRechargeAt }
}
