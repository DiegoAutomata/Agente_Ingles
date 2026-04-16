'use client'

import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport, UIMessage } from 'ai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useWebSpeech } from './useWebSpeech'
import { useSpeechSynthesis } from './useSpeechSynthesis'

export type ConversationPhase = 'idle' | 'alex-speaking' | 'user-turn' | 'processing'

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('')
}

export function useVoiceConversation(mode = 'voice_conversation') {
  const [phase, setPhase] = useState<ConversationPhase>('idle')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [hasStarted, setHasStarted] = useState(false)

  // Refs para evitar closures stale
  const phaseRef = useRef<ConversationPhase>('idle')
  const speakRef = useRef<(text: string) => void>(() => {})
  const startListeningRef = useRef<() => void>(() => {})
  const stopListeningRef = useRef<() => void>(() => {})
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { phaseRef.current = phase }, [phase])

  const transport = useMemo(
    () => new TextStreamChatTransport({ api: '/api/tutor', body: { mode } }),
    [mode]
  )

  const { messages, sendMessage, status } = useChat({
    transport,
    onFinish: ({ message }) => {
      const text = getMessageText(message)
      if (text) {
        setPhase('alex-speaking')
        speakRef.current(text)
      } else {
        activateUserTurnRef.current()
      }
    },
  })

  // TTS con español (Alex habla principalmente en español)
  const { isSpeaking, speak, stop: stopSpeaking, isSupported: ttsSupported } = useSpeechSynthesis({
    lang: 'es-ES',
    rate: 0.88,
  })

  // STT en inglés (el usuario practica inglés)
  const sentRef = useRef(false) // evitar doble envío si onResult se llama varias veces

  const { isListening, startListening, stopListening, isSupported: sttSupported } = useWebSpeech({
    language: 'en-US',
    onResult: (transcript) => {
      if (phaseRef.current !== 'user-turn') return
      if (sentRef.current) return // ya se envió en esta sesión de escucha
      sentRef.current = true
      clearTimeout(silenceTimerRef.current ?? undefined)
      setInterimTranscript('')
      setPhase('processing')
      sendMessage({ text: transcript })
    },
    onInterim: (text) => {
      clearTimeout(silenceTimerRef.current ?? undefined)
      silenceTimerRef.current = setTimeout(() => {
        if (phaseRef.current === 'user-turn') {
          stopListeningRef.current()
        }
      }, 7000)
      setInterimTranscript(text)
    },
    onError: (err) => {
      setVoiceError(err)
      if (phaseRef.current === 'user-turn') setPhase('idle')
    },
  })

  // Sincronizar refs con valores actuales
  useEffect(() => { speakRef.current = speak }, [speak])
  useEffect(() => { startListeningRef.current = startListening }, [startListening])
  useEffect(() => { stopListeningRef.current = stopListening }, [stopListening])

  const activateUserTurn = useCallback(() => {
    clearTimeout(silenceTimerRef.current ?? undefined)
    clearTimeout(transitionTimerRef.current ?? undefined)
    sentRef.current = false // reset para nueva sesión de escucha
    setInterimTranscript('')
    setPhase('user-turn')
    startListeningRef.current()
    // Timeout de silencio de 10s
    silenceTimerRef.current = setTimeout(() => {
      if (phaseRef.current === 'user-turn') {
        stopListeningRef.current()
        setPhase('idle')
      }
    }, 10000)
  }, [])

  // Ref para activateUserTurn (evitar dep circular en useChat.onFinish)
  const activateUserTurnRef = useRef(activateUserTurn)
  useEffect(() => { activateUserTurnRef.current = activateUserTurn }, [activateUserTurn])

  // Detectar cuando TTS termina → activar mic automáticamente
  useEffect(() => {
    if (!isSpeaking && phaseRef.current === 'alex-speaking' && hasStarted) {
      transitionTimerRef.current = setTimeout(() => {
        if (phaseRef.current === 'alex-speaking') {
          activateUserTurn()
        }
      }, 700)
    }
    return () => clearTimeout(transitionTimerRef.current ?? undefined)
  }, [isSpeaking, hasStarted, activateUserTurn])

  const startConversation = useCallback((initialMessage: string) => {
    setHasStarted(true)
    setPhase('alex-speaking')
    speakRef.current(initialMessage)
  }, [])

  const forceMicTurn = useCallback(() => {
    stopSpeaking()
    clearTimeout(transitionTimerRef.current ?? undefined)
    activateUserTurn()
  }, [stopSpeaking, activateUserTurn])

  const pauseConversation = useCallback(() => {
    stopSpeaking()
    stopListeningRef.current()
    clearTimeout(silenceTimerRef.current ?? undefined)
    clearTimeout(transitionTimerRef.current ?? undefined)
    setPhase('idle')
  }, [stopSpeaking])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      clearTimeout(silenceTimerRef.current ?? undefined)
      clearTimeout(transitionTimerRef.current ?? undefined)
      stopSpeaking()
      stopListeningRef.current()
    }
  }, [stopSpeaking])

  return {
    phase,
    messages,
    interimTranscript,
    voiceError,
    hasStarted,
    isLoading: status === 'submitted' || status === 'streaming',
    isSpeaking,
    isListening,
    sttSupported,
    ttsSupported,
    startConversation,
    forceMicTurn,
    pauseConversation,
  }
}
