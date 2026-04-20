'use client'

import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport, UIMessage } from 'ai'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('')
}

const VISIBLE_PATHS = [
  '/lesson', '/challenge', '/verb-drill',
  '/vocabulary', '/writing', '/puzzle', '/dashboard',
]

const GREETINGS: Record<string, string> = {
  '/lesson':    '¡Hola! ¿Tenés alguna duda de la lección? Preguntame lo que quieras. 📚',
  '/challenge': '¡Hola! ¿Alguna duda sobre los ejercicios? Estoy acá. ⚔️',
  '/verb-drill':'¡Hola! ¿Tenés dudas sobre alguno de los 16 verbos? Preguntame. ⚡',
  '/vocabulary':'¡Hola! ¿Alguna duda sobre pronunciación o significado? 🃏',
  '/writing':   '¡Hola! ¿Querés que te explique alguna regla de gramática? ✍️',
  '/puzzle':    '¡Hola! ¿Tenés alguna duda? Preguntame lo que necesités. 🧩',
  '/dashboard': '¡Hola! ¿En qué te puedo ayudar hoy? 💬',
}

// Panel separado para que useChat solo se instancie cuando el usuario abre el chat
function AlexChatPanel({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const transport = useMemo(
    () => new TextStreamChatTransport({ api: '/api/tutor', body: { mode: 'conversation' } }),
    []
  )

  const initialMessages = useMemo<UIMessage[]>(
    () => [{ id: 'init', role: 'assistant', parts: [{ type: 'text', text: GREETINGS[pathname] ?? GREETINGS['/dashboard'] }] }],
    [pathname]
  )

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: initialMessages,
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <div
      className="fixed bottom-[88px] right-6 z-50 w-[340px] flex flex-col glass-card border-violet-500/20 rounded-2xl overflow-hidden shadow-2xl shadow-black/40"
      style={{ height: '300px', animation: 'slide-up 0.2s ease-out' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">🎓</span>
          <span className="text-sm font-semibold text-white">Alex</span>
          <span className="text-xs text-white/30">Tu asistente</span>
        </div>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/60 transition-colors text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.map(message => {
          const text = getMessageText(message)
          return (
            <div
              key={message.id}
              className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                message.role === 'assistant'
                  ? 'bg-violet-500/20 border border-violet-500/30'
                  : 'bg-white/10 border border-white/10'
              }`}>
                {message.role === 'assistant' ? '🎓' : '👤'}
              </div>
              <div className={`max-w-[78%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                message.role === 'assistant'
                  ? 'bg-white/5 border border-white/8 text-white/90'
                  : 'bg-violet-600/25 border border-violet-500/20 text-white'
              }`}>
                {text}
              </div>
            </div>
          )
        })}

        {isLoading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-xs shrink-0">
              🎓
            </div>
            <div className="bg-white/5 border border-white/8 px-3 py-2 rounded-xl">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1 h-1 bg-violet-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/5 shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Preguntale algo a Alex…"
            className="input-field flex-1 text-sm py-2"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="shrink-0 w-9 h-9 rounded-xl btn-primary p-0 flex items-center justify-center disabled:opacity-40 text-base"
          >
            ↑
          </button>
        </form>
      </div>
    </div>
  )
}

export default function FloatingAlexChat() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const isVisible = VISIBLE_PATHS.includes(pathname)

  if (!mounted || !isVisible) return null

  return (
    <>
      {/* Panel solo se monta (y useChat solo se instancia) cuando está abierto */}
      {isOpen && (
        <AlexChatPanel pathname={pathname} onClose={() => setIsOpen(false)} />
      )}

      {/* Floating button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex flex-col items-center justify-center gap-0 shadow-lg transition-all
          bg-gradient-to-br from-violet-500 to-indigo-600 border border-violet-400/30
          hover:scale-105 active:scale-95
          ${!isOpen ? 'shadow-violet-500/30' : 'shadow-none scale-95'}
        `}
        aria-label="Abrir chat con Alex"
      >
        <span className="text-xl leading-none">{isOpen ? '✕' : '🎓'}</span>
        {!isOpen && (
          <span className="text-[9px] font-bold text-white/80 leading-tight">Alex</span>
        )}
      </button>
    </>
  )
}
