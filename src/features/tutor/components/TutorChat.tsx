'use client'

import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport, UIMessage } from 'ai'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useWebSpeech } from '../hooks/useWebSpeech'
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis'

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('')
}

interface TutorChatProps {
  mode: 'conversation' | 'lesson' | 'verb_drill' | 'writing' | 'vocabulary'
  initialMessage?: string
  placeholder?: string
}

export default function TutorChat({ mode, initialMessage, placeholder }: TutorChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [mounted, setMounted] = useState(false)
  const [analyzingSession, setAnalyzingSession] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  async function handleEndSession() {
    if (messages.length < 3 || analyzingSession) return
    setAnalyzingSession(true)
    const transcript = messages.map(m => ({
      role: m.role,
      content: getMessageText(m),
    }))
    try {
      await fetch('/api/analyze-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          session_id: `conversation-${Date.now()}`,
        }),
      })
    } catch { /* offline */ } finally {
      setAnalyzingSession(false)
      setSessionDone(true)
    }
  }

  const transport = useMemo(
    () => new TextStreamChatTransport({ api: '/api/tutor', body: { mode } }),
    [mode]
  )

  const initialMessages = useMemo<UIMessage[]>(
    () => initialMessage
      ? [{ id: 'init', role: 'assistant', parts: [{ type: 'text', text: initialMessage }] }]
      : [],
    [initialMessage]
  )

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: initialMessages,
    onFinish: ({ message }) => {
      if (autoSpeak) {
        speak(getMessageText(message))
      }
    },
  })

  const isLoading = status === 'submitted' || status === 'streaming'

  const { isListening, startListening, stopListening, isSupported: sttSupported } = useWebSpeech({
    language: 'en-US',
    onResult: (transcript) => {
      // Auto-envía el mensaje cuando el usuario para de hablar
      if (transcript.trim()) {
        stopSpeaking()
        sendMessage({ text: transcript })
        setInput('')
      }
    },
    onInterim: (transcript) => {
      setInput(transcript)
    },
    onError: setVoiceError,
  })

  const { isSpeaking, speak, stop: stopSpeaking, isSupported: ttsSupported } = useSpeechSynthesis()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleVoiceToggle() {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    stopListening()
    stopSpeaking()
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-xs text-white/40 capitalize">{mode.replace('_', ' ')} mode</span>
        <div className="flex items-center gap-2">
          {(mode === 'conversation' || mode === 'writing' || mode === 'verb_drill') && messages.length >= 3 && !sessionDone && (
            <button
              onClick={handleEndSession}
              disabled={analyzingSession}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all bg-green-500/15 text-green-300 border border-green-500/20 hover:bg-green-500/25 disabled:opacity-50"
            >
              {analyzingSession ? '⏳ Analizando…' : '✅ Terminar sesión'}
            </button>
          )}
          {sessionDone && (
            <span className="text-xs text-green-400 px-2">¡Perfil actualizado!</span>
          )}
          {mounted && ttsSupported && (
            <button
              onClick={() => {
                setAutoSpeak(!autoSpeak)
                if (autoSpeak) stopSpeaking()
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                autoSpeak
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/20'
                  : 'bg-white/5 text-white/40 border border-white/10'
              }`}
            >
              {isSpeaking ? '🔊' : '🔈'}
              {autoSpeak ? 'Voz ON' : 'Voz OFF'}
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => {
          const text = getMessageText(message)
          return (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                message.role === 'assistant'
                  ? 'bg-violet-500/20 border border-violet-500/30'
                  : 'bg-white/10 border border-white/10'
              }`}>
                {message.role === 'assistant' ? '🎓' : '👤'}
              </div>

              <div className={`max-w-[75%] ${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  message.role === 'assistant'
                    ? 'glass-card text-white/90'
                    : 'bg-violet-600/30 border border-violet-500/20 text-white'
                }`}>
                  {text}
                </div>
                {message.role === 'assistant' && mounted && ttsSupported && text && (
                  <button
                    onClick={() => speak(text)}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors px-1"
                  >
                    🔊 Escuchar
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-sm">
              🎓
            </div>
            <div className="glass-card px-4 py-3 rounded-2xl">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Error de voz */}
      {voiceError && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-300">
          {voiceError}
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-white/5">
        <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
          {mounted && sttSupported && (
            <button
              type="button"
              onClick={handleVoiceToggle}
              className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                isListening
                  ? 'bg-violet-500 text-white voice-active'
                  : 'glass-card text-white/50 hover:text-white/80'
              }`}
            >
              {isListening ? '⏹' : '🎙️'}
            </button>
          )}

          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isListening ? 'Escuchando...' : (placeholder ?? 'Escribe o habla en inglés...')}
            className="input-field flex-1"
            readOnly={isListening}
          />

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="shrink-0 w-10 h-10 rounded-xl btn-primary p-0 flex items-center justify-center disabled:opacity-40"
          >
            ↑
          </button>
        </form>

        {isListening && (
          <p className="text-center text-xs text-violet-400 mt-2 animate-pulse">
            Escuchando... habla en inglés
          </p>
        )}
      </div>
    </div>
  )
}
