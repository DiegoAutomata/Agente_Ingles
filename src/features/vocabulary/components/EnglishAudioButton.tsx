'use client'

import { useEffect, useState } from 'react'

export default function EnglishAudioButton({ text }: { text: string }) {
  const [supported, setSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSupported('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window)
  }, [])

  useEffect(() => {
    setError(null)
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [text])

  function speak() {
    setError(null)
    try {
      const synthesis = window.speechSynthesis
      const voices = synthesis.getVoices()
      const voice = voices.find(v => v.lang === 'en-US') ?? voices.find(v => /^en[-_]/i.test(v.lang) || v.lang === 'en')
      if (voices.length && !voice) {
        setError('No hay una voz en inglés disponible en este navegador.')
        return
      }
      synthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = voice?.lang ?? 'en-US'
      utterance.rate = 0.85
      if (voice) utterance.voice = voice
      utterance.onerror = event => {
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          setError('No se pudo reproducir el audio. Volvé a intentarlo.')
        }
      }
      synthesis.speak(utterance)
    } catch {
      setError('No se pudo reproducir el audio en este navegador.')
    }
  }

  if (!supported) return <p className="text-center text-white/40 text-xs">Audio no disponible en este navegador.</p>

  return (
    <div className="text-center space-y-2">
      <button type="button" onClick={speak} className="btn-ghost text-sm">🔊 Escuchar en inglés</button>
      {error && <p role="status" className="text-amber-200 text-sm">{error}</p>}
    </div>
  )
}
