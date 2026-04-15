'use client'

import { useState, useRef, useCallback } from 'react'

interface UseSpeechSynthesisOptions {
  lang?: string
  rate?: number
  pitch?: number
}

export function useSpeechSynthesis({
  lang = 'en-US',
  rate = 0.9,
  pitch = 1.0,
}: UseSpeechSynthesisOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const speak = useCallback((text: string) => {
    if (!isSupported) return

    // Cancelar cualquier síntesis en curso
    window.speechSynthesis.cancel()

    // Limpiar texto de markdown y símbolos
    const cleanText = text
      .replace(/[*_`#~]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\n+/g, '. ')
      .trim()

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = lang
    utterance.rate = rate
    utterance.pitch = pitch

    // Preferir voz femenina en inglés si está disponible
    const voices = window.speechSynthesis.getVoices()
    const preferredVoice = voices.find(v =>
      v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Moira'))
    ) || voices.find(v => v.lang.startsWith('en'))

    if (preferredVoice) {
      utterance.voice = preferredVoice
    }

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }, [isSupported, lang, rate, pitch])

  const stop = useCallback(() => {
    if (!isSupported) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [isSupported])

  return {
    isSpeaking,
    isSupported,
    speak,
    stop,
  }
}
