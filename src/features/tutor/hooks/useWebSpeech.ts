'use client'

import { useState, useRef, useCallback } from 'react'

interface UseWebSpeechOptions {
  language?: string
  onResult?: (transcript: string) => void
  onError?: (error: string) => void
}

export function useWebSpeech({
  language = 'en-US',
  onResult,
  onError,
}: UseWebSpeechOptions = {}) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<{ stop: () => void } | null>(null)

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const startListening = useCallback(() => {
    if (!isSupported) {
      onError?.('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.')
      return
    }

    type SpeechRecognitionCtor = new () => {
      lang: string
      interimResults: boolean
      maxAlternatives: number
      continuous: boolean
      onstart: (() => void) | null
      onresult: ((e: { results: { [0]: { [0]: { transcript: string } } } }) => void) | null
      onerror: ((e: { error: string }) => void) | null
      onend: (() => void) | null
      start: () => void
      stop: () => void
    }

    const win = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }
    const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition
    if (!SpeechRecognitionAPI) return

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = language
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false

    recognition.onstart = () => {
      setIsListening(true)
      setTranscript('')
    }

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript
      setTranscript(result)
      onResult?.(result)
    }

    recognition.onerror = (event) => {
      setIsListening(false)
      if (event.error !== 'aborted') {
        onError?.(`Error de reconocimiento: ${event.error}`)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isSupported, language, onResult, onError])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
  }
}
