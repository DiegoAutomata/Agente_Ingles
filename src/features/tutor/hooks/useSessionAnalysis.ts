'use client'
import { useRef, useState } from 'react'
import type { UIMessage } from 'ai'

export interface SessionFeedback {
  wins: string[]
  errors: { user_attempt: string; correct_form: string; pattern: string }[]
}

export function useSessionAnalysis(mode: string) {
  const id = useRef<string | null>(null)
  const lock = useRef(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null)
  async function save(messages: UIMessage[]) {
    if (lock.current || done) return
    lock.current = true
    id.current ??= `${mode}-${crypto.randomUUID()}`
    setSaving(true); setError(null)
    try {
      const response = await fetch('/api/analyze-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: id.current, mode, transcript: messages.map(m => ({ role: m.role, content: m.parts.filter(p => p.type === 'text').map(p => p.text).join('') })).filter(m => m.content) }),
      })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error('No se pudo guardar el análisis. Reintenta al terminar la sesión.')
      setFeedback(result.analysis); setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el análisis.')
    } finally { lock.current = false; setSaving(false) }
  }
  function reset() {
    if (lock.current) return
    id.current = null; setDone(false); setError(null); setFeedback(null)
  }
  return { save, reset, saving, done, error, feedback }
}
