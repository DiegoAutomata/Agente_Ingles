'use client'

import { useEffect, useRef, useState, ReactElement } from 'react'
import { UIMessage } from 'ai'
import { useVoiceConversation, ConversationPhase } from '../hooks/useVoiceConversation'

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('')
}

// ── Avatar de Alex con anillos animados por fase ──
function AlexAvatar({ phase }: { phase: ConversationPhase }) {
  return (
    <div className="relative flex items-center justify-center w-52 h-52">
      {/* Anillos pulsantes — Alex hablando */}
      {phase === 'alex-speaking' && (
        <>
          <div className="absolute inset-0 rounded-full border-2 border-violet-500/50 alex-ring-1" />
          <div className="absolute inset-0 rounded-full border-2 border-violet-400/30 alex-ring-2" />
          <div className="absolute inset-0 rounded-full border border-violet-300/15 alex-ring-3" />
        </>
      )}

      {/* Anillo verde — turno del usuario */}
      {phase === 'user-turn' && (
        <div className="absolute inset-4 rounded-full border-2 border-emerald-500/50 animate-pulse" />
      )}

      {/* Spinner — procesando */}
      {phase === 'processing' && (
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-amber-400/70 processing-ring" />
      )}

      {/* Avatar central */}
      <div className={`
        relative w-32 h-32 rounded-full flex flex-col items-center justify-center gap-1
        transition-all duration-500 ease-in-out
        ${phase === 'alex-speaking'
          ? 'bg-gradient-to-br from-violet-600/30 to-indigo-600/30 border-2 border-violet-500/50 shadow-[0_0_50px_rgba(139,92,246,0.35)]'
          : phase === 'user-turn'
          ? 'bg-gradient-to-br from-emerald-600/20 to-cyan-600/20 border-2 border-emerald-500/40'
          : phase === 'processing'
          ? 'bg-gradient-to-br from-amber-600/20 to-orange-600/20 border border-amber-500/30'
          : 'bg-white/5 border border-white/10'
        }
      `}>
        <span className="text-5xl select-none">🎓</span>
        <span className="text-xs font-semibold text-white/60 tracking-wide">ALEX</span>
      </div>
    </div>
  )
}

// ── Barras de audio — turno del usuario ──
function AudioBars() {
  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {[1,2,3,4,5,6,7].map(i => (
        <div
          key={i}
          className={`w-1 bg-emerald-400 rounded-full audio-bar-${i}`}
          style={{ height: '20px', transformOrigin: 'bottom' }}
        />
      ))}
    </div>
  )
}

// ── Label de estado ──
function PhaseLabel({ phase, interimTranscript }: { phase: ConversationPhase; interimTranscript: string }) {
  const labels: Record<ConversationPhase, ReactElement> = {
    idle: <p className="text-white/30 text-sm">Listo para comenzar</p>,
    'alex-speaking': <p className="text-violet-300 text-sm animate-pulse font-medium">Alex está hablando...</p>,
    'user-turn': (
      <div className="text-center space-y-1">
        <p className="text-emerald-400 text-sm font-medium">Tu turno — habla en inglés</p>
        {interimTranscript && (
          <p className="text-white/40 text-xs italic max-w-xs mx-auto line-clamp-2">
            &ldquo;{interimTranscript}&rdquo;
          </p>
        )}
      </div>
    ),
    processing: <p className="text-amber-400 text-sm animate-pulse">Procesando...</p>,
  }
  return labels[phase]
}

// ── Componente principal ──
interface VoiceConversationProps {
  mode?: string
  initialMessage?: string
}

export default function VoiceConversation({ mode = 'voice_conversation', initialMessage }: VoiceConversationProps) {
  const [mounted, setMounted] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  const {
    phase,
    messages,
    interimTranscript,
    voiceError,
    hasStarted,
    isLoading,
    sttSupported,
    ttsSupported,
    startConversation,
    forceMicTurn,
    pauseConversation,
  } = useVoiceConversation(mode)

  // Auto-iniciar cuando el browser está listo
  useEffect(() => {
    if (!mounted || !ttsSupported || hasStarted) return
    const msg = initialMessage ?? 'Hola, soy Alex, tu tutor de inglés. Vamos a practicar conversación. Te hablo en español para que entiendas todo, pero vos respondeme en inglés. ¿Listo? Empecemos. Contame: ¿a qué te dedicás?'
    const t = setTimeout(() => startConversation(msg), 900)
    return () => clearTimeout(t)
  }, [mounted, ttsSupported, hasStarted, initialMessage, startConversation])

  // Auto-scroll transcript
  useEffect(() => {
    if (showTranscript) transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showTranscript])

  if (!mounted) return null

  const canUseVoice = sttSupported && ttsSupported

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-colors ${
            phase === 'idle' ? 'bg-white/20' : 'bg-emerald-400 animate-pulse'
          }`} />
          <span className="text-xs text-white/40">
            {hasStarted ? 'Conversación activa' : 'Conversación de voz'}
          </span>
        </div>

        {!canUseVoice && (
          <span className="text-xs text-yellow-400/80 bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20">
            Requiere Chrome o Edge
          </span>
        )}

        {voiceError && (
          <span className="text-xs text-red-400/80 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20 max-w-xs truncate">
            {voiceError}
          </span>
        )}
      </div>

      {/* Zona central: avatar + estado */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
        <AlexAvatar phase={phase} />

        <PhaseLabel phase={phase} interimTranscript={interimTranscript} />

        {phase === 'user-turn' && <AudioBars />}

        {/* Inicio manual si TTS no soportado */}
        {!hasStarted && mounted && !ttsSupported && (
          <div className="text-center space-y-3">
            <p className="text-white/40 text-sm">Tu navegador no soporta síntesis de voz.</p>
            <p className="text-white/30 text-xs">Usá Chrome o Edge para la experiencia completa.</p>
          </div>
        )}

        {/* Inicio manual por si el auto-inicio falla */}
        {!hasStarted && mounted && ttsSupported && (
          <button
            onClick={() => startConversation(
              initialMessage ?? 'Hola, soy Alex. Vamos a practicar conversación en inglés. Respondeme en inglés: ¿a qué te dedicás?'
            )}
            className="btn-primary px-8 py-3 text-sm mt-2"
          >
            Comenzar conversación
          </button>
        )}

        {/* Dots de loading */}
        {isLoading && (
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-amber-400/60 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controles + Transcript */}
      <div className="px-5 pb-5 space-y-4">

        {/* Botones de control — solo si inició */}
        {hasStarted && (
          <div className="flex items-center justify-center gap-4">
            {/* Forzar turno mic */}
            <button
              onClick={forceMicTurn}
              disabled={phase === 'user-turn' || phase === 'processing'}
              title="Activar mi micrófono ahora"
              className={`
                w-12 h-12 rounded-full flex items-center justify-center text-lg
                border transition-all disabled:opacity-30 disabled:cursor-not-allowed
                ${phase === 'user-turn'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'glass-card border-white/10 text-white/50 hover:text-white hover:border-white/20'
                }
              `}
            >
              🎙️
            </button>

            {/* Pausar / Reanudar */}
            <button
              onClick={() => {
                if (phase === 'idle') {
                  startConversation('¿Continuamos? Cuando quieras, seguimos con la práctica.')
                } else {
                  pauseConversation()
                }
              }}
              title={phase === 'idle' ? 'Reanudar' : 'Pausar'}
              className="w-14 h-14 rounded-full glass-card border border-white/10
                         text-white/60 hover:text-white hover:border-white/20
                         transition-all flex items-center justify-center text-xl"
            >
              {phase === 'idle' ? '▶' : '⏸'}
            </button>

            {/* Placeholder derecho para simetría */}
            <div className="w-12 h-12" />
          </div>
        )}

        {/* Toggle transcript */}
        {messages.length > 1 && (
          <button
            onClick={() => setShowTranscript(v => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5
                       text-xs text-white/25 hover:text-white/40 transition-colors"
          >
            <span>{showTranscript ? '▲' : '▼'}</span>
            <span>{showTranscript ? 'Ocultar' : 'Ver'} conversación</span>
          </button>
        )}

        {/* Transcript colapsable */}
        {showTranscript && (
          <div className="max-h-44 overflow-y-auto space-y-2 px-1">
            {messages.map(msg => {
              const text = getMessageText(msg)
              if (!text) return null
              return (
                <div
                  key={msg.id}
                  className={`transcript-entry text-xs px-3 py-2 rounded-xl leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'glass-card text-white/55'
                      : 'bg-violet-500/10 border border-violet-500/10 text-white/45 text-right'
                  }`}
                >
                  <span className="block text-white/25 mb-0.5 font-medium text-[10px] uppercase tracking-wider">
                    {msg.role === 'assistant' ? 'Alex' : 'Vos'}
                  </span>
                  {text}
                </div>
              )
            })}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}
