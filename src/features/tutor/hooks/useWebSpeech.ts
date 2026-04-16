'use client'

import { useState, useRef, useCallback } from 'react'

interface UseWebSpeechOptions {
  language?: string
  onResult?: (transcript: string) => void
  onInterim?: (transcript: string) => void
  onError?: (error: string) => void
}

export function useWebSpeech({
  language = 'en-US',
  onResult,
  onInterim,
  onError,
}: UseWebSpeechOptions = {}) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refs para callbacks — evita closures stale dentro de los event handlers
  const onResultRef = useRef(onResult)
  const onInterimRef = useRef(onInterim)
  const onErrorRef = useRef(onError)
  onResultRef.current = onResult
  onInterimRef.current = onInterim
  onErrorRef.current = onError

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const startListening = useCallback(() => {
    if (!isSupported) {
      onErrorRef.current?.('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.')
      return
    }

    type SpeechRecognitionCtor = new () => {
      lang: string
      interimResults: boolean
      maxAlternatives: number
      continuous: boolean
      onstart: (() => void) | null
      onresult: ((e: SpeechRecognitionEvent) => void) | null
      onerror: ((e: { error: string }) => void) | null
      onend: (() => void) | null
      start: () => void
      stop: () => void
      abort: () => void
    }

    type SpeechRecognitionEvent = {
      resultIndex: number
      results: {
        length: number
        [i: number]: { isFinal: boolean; [j: number]: { transcript: string } }
      }
    }

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor
      webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return

    // Limpiar sesión anterior
    clearTimeout(stopTimerRef.current ?? undefined)
    recognitionRef.current?.abort()

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = language
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    // continuous: true → Chrome NO corta si el usuario hace una pausa natural al pensar
    recognition.continuous = true

    recognition.onstart = () => {
      setIsListening(true)
      setTranscript('')
    }

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript

        if (result.isFinal) {
          const trimmed = text.trim()
          if (!trimmed) continue

          setTranscript(trimmed)

          // Llamar onResult inmediatamente — no esperar a onend
          onResultRef.current?.(trimmed)

          // Detener el reconocimiento 800ms después del resultado final
          // (da tiempo a capturar posible continuación de la frase)
          clearTimeout(stopTimerRef.current ?? undefined)
          stopTimerRef.current = setTimeout(() => {
            recognitionRef.current?.stop()
          }, 800)
        } else {
          // Resultado interim — muestra en UI mientras el usuario habla
          setTranscript(text)
          onInterimRef.current?.(text)

          // Resetear el timer de stop si sigue hablando
          clearTimeout(stopTimerRef.current ?? undefined)
        }
      }
    }

    recognition.onerror = (event) => {
      setIsListening(false)
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        onErrorRef.current?.(`Error de micrófono: ${event.error}. Verificá los permisos.`)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isSupported, language])

  const stopListening = useCallback(() => {
    clearTimeout(stopTimerRef.current ?? undefined)
    recognitionRef.current?.stop()
  }, [])

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
  }
}
