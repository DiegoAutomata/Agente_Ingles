'use client'

import { useState } from 'react'
import type { WritingFeedback } from '@/app/api/writing-coach/route'
import { createClient } from '@/lib/supabase/client'

const PROMPTS = [
  { label: '📧 Email al jefe',     text: 'Write a short email to your boss saying you will be 15 minutes late to the morning meeting due to a traffic jam.' },
  { label: '🙏 Pedir un favor',    text: 'Write a message to a colleague asking them to cover your shift this Friday because you have a doctor appointment.' },
  { label: '📝 Presentarse',       text: 'Write a short paragraph introducing yourself: your name, what you do, where you are from, and one interesting fact about you.' },
  { label: '🏨 Queja en hotel',    text: 'Write a complaint to a hotel saying that your room was noisy, the air conditioning was broken, and the breakfast was cold.' },
  { label: '🤝 LinkedIn',          text: 'Write a short LinkedIn message to connect with a professional in your industry that you met at a conference.' },
]

const TYPE_COLORS: Record<string, string> = {
  grammar:     'border-red-500/40 bg-red-500/5 text-red-400',
  vocabulary:  'border-blue-500/40 bg-blue-500/5 text-blue-400',
  spelling:    'border-orange-500/40 bg-orange-500/5 text-orange-400',
  style:       'border-yellow-500/40 bg-yellow-500/5 text-yellow-400',
  punctuation: 'border-purple-500/40 bg-purple-500/5 text-purple-400',
}

const TYPE_LABELS: Record<string, string> = {
  grammar:     'Gramática',
  vocabulary:  'Vocabulario',
  spelling:    'Ortografía',
  style:       'Estilo',
  punctuation: 'Puntuación',
}

type Phase = 'write' | 'loading' | 'results'

export default function CorrectionBoard() {
  const [phase, setPhase] = useState<Phase>('write')
  const [text, setText] = useState('')
  const [activePrompt, setActivePrompt] = useState<string | undefined>(undefined)
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!text.trim() || text.trim().length < 10) return
    setPhase('loading')
    setError(null)

    try {
      const res = await fetch('/api/writing-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, prompt: activePrompt }),
      })
      if (!res.ok) throw new Error('Error del servidor')
      const data = (await res.json()) as WritingFeedback
      setFeedback(data)
      setPhase('results')

      // Award XP + update learner profile (fire-and-forget)
      const xp = Math.round(data.overallScore * 8) // max 80 XP
      const supabase = createClient()
      supabase.rpc('increment_xp', { xp_amount: xp }).then(() => {})
      const errorSummary = data.errors.map(e => `${e.type}: "${e.wrong}" → "${e.correct}"`).join('; ')
      fetch('/api/analyze-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: [
            { role: 'user', content: `[Writing submission]\n${text}` },
            { role: 'assistant', content: `[Feedback] Score: ${data.overallScore}/10. ${data.summary}${errorSummary ? ` Errors: ${errorSummary}.` : ''} Strengths: ${data.strengths.join(', ')}.` },
          ],
          session_id: `writing-${Date.now()}`,
        }),
      }).catch(() => {})
    } catch {
      setError('No se pudo analizar el texto. Verificá la conexión e intentá de nuevo.')
      setPhase('write')
    }
  }

  function reset() {
    setText('')
    setFeedback(null)
    setPhase('write')
  }

  // ── WRITE ──────────────────────────────────────────────────────────
  if (phase === 'write') {
    return (
      <div className="flex flex-col flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full gap-5">
        <p className="text-white/40 text-sm text-center pt-2">
          Escribí tu texto en inglés y Alex te da correcciones detalladas con las reglas de gramática.
        </p>

        {/* Quick prompts */}
        <div>
          <p className="text-white/30 text-xs uppercase tracking-wider mb-2">Elegí un ejercicio o escribí tu propio texto</p>
          <div className="flex flex-wrap gap-2">
            {PROMPTS.map(p => (
              <button
                key={p.label}
                onClick={() => { setText(p.text); setActivePrompt(p.label) }}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/50 hover:border-violet-500/40 hover:text-violet-300 transition-all"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Write your English text here... (email, message, cover letter, paragraph — anything!)"
            rows={10}
            className="w-full glass-card p-4 text-white/80 text-sm leading-relaxed resize-none placeholder-white/20 focus:outline-none focus:border-violet-500/40 transition-colors"
          />
          <div className="absolute bottom-3 right-3 text-white/20 text-xs tabular-nums">
            {text.length} chars
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={text.trim().length < 10}
          className={`w-full py-4 rounded-xl font-semibold text-sm transition-all ${
            text.trim().length >= 10
              ? 'btn-primary'
              : 'bg-white/5 text-white/25 border border-white/10 cursor-not-allowed'
          }`}
        >
          ✍️ Corregir con Alex →
        </button>
      </div>
    )
  }

  // ── LOADING ────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-5">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
          <div className="absolute inset-3 flex items-center justify-center text-xl">✍️</div>
        </div>
        <div className="text-center">
          <p className="text-white font-medium">Alex está leyendo tu texto…</p>
          <p className="text-white/40 text-sm mt-1">Identificando errores y preparando correcciones</p>
        </div>
      </div>
    )
  }

  // ── RESULTS ────────────────────────────────────────────────────────
  if (!feedback) return null

  const scoreColor =
    feedback.overallScore >= 8 ? 'text-green-400' :
    feedback.overallScore >= 6 ? 'text-yellow-400' : 'text-red-400'

  const scoreBg =
    feedback.overallScore >= 8 ? 'border-green-500/30 bg-green-500/5' :
    feedback.overallScore >= 6 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-red-500/30 bg-red-500/5'

  return (
    <div className="flex flex-col flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full gap-6">

      {/* Score banner */}
      <div className={`glass-card p-5 border ${scoreBg}`}>
        <div className="flex items-center gap-4">
          <div className={`text-4xl font-bold ${scoreColor}`}>
            {feedback.overallScore}<span className="text-xl text-white/30">/10</span>
          </div>
          <p className="text-white/70 text-sm leading-relaxed flex-1">{feedback.summary}</p>
        </div>
      </div>

      {/* Errors */}
      {feedback.errors.length > 0 ? (
        <div>
          <p className="text-white/40 text-xs uppercase tracking-wider mb-3">
            {feedback.errors.length} error{feedback.errors.length !== 1 ? 'es' : ''} encontrado{feedback.errors.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-3">
            {feedback.errors.map((err, i) => (
              <div key={i} className={`glass-card p-4 border ${TYPE_COLORS[err.type] ?? TYPE_COLORS.grammar}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] uppercase tracking-wider font-semibold opacity-70">
                    {TYPE_LABELS[err.type] ?? err.type}
                  </span>
                </div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1">
                    <p className="text-xs text-white/30 mb-0.5">Incorrecto</p>
                    <p className="text-sm line-through opacity-60">"{err.wrong}"</p>
                  </div>
                  <div className="text-white/20 mt-4">→</div>
                  <div className="flex-1">
                    <p className="text-xs text-white/30 mb-0.5">Correcto</p>
                    <p className="text-sm font-semibold text-green-300">"{err.correct}"</p>
                  </div>
                </div>
                <p className="text-xs text-white/50 leading-relaxed border-t border-white/10 pt-2">
                  💡 {err.rule}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-card p-4 text-center border-green-500/30 bg-green-500/5">
          <p className="text-green-300 font-semibold">🎉 ¡Sin errores detectados!</p>
          <p className="text-white/40 text-sm mt-1">Tu texto está muy bien escrito.</p>
        </div>
      )}

      {/* Corrected text */}
      <div>
        <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Texto corregido</p>
        <div className="glass-card p-4 border-green-500/20 bg-green-500/5">
          <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{feedback.correctedText}</p>
        </div>
      </div>

      {/* Strengths + Tips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {feedback.strengths.length > 0 && (
          <div className="glass-card p-4">
            <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-2">✅ Lo que hiciste bien</p>
            <ul className="space-y-1">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="text-white/60 text-sm">• {s}</li>
              ))}
            </ul>
          </div>
        )}
        {feedback.tips.length > 0 && (
          <div className="glass-card p-4">
            <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-2">💡 Tips para mejorar</p>
            <ul className="space-y-1">
              {feedback.tips.map((t, i) => (
                <li key={i} className="text-white/60 text-sm">• {t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pb-4">
        <button onClick={reset} className="btn-primary flex-1">
          ✍️ Escribir otro texto
        </button>
      </div>
    </div>
  )
}
