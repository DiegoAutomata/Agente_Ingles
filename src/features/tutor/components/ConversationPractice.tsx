'use client'
import { useState } from 'react'
import VoiceConversation from './VoiceConversation'
import TutorChat from './TutorChat'

export default function ConversationPractice() {
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')
  return <div className="flex flex-col h-full min-h-0">
    <div className="flex gap-3 px-4 py-2" aria-label="Modo de conversación">
      <button className="btn-ghost" aria-pressed={inputMode === 'text'} onClick={() => setInputMode('text')}>Texto y audio</button>
      <button className="btn-ghost" aria-pressed={inputMode === 'voice'} onClick={() => setInputMode('voice')}>Micrófono</button>
    </div>
    <div className="flex-1 min-h-0 overflow-auto">
      {inputMode === 'voice' ? <VoiceConversation initialMessage="Hello! I am Alex. What do you do for work?" /> : <TutorChat mode="conversation" initialMessage="¡Hola! Practiquemos una presentación breve. What do you do for work? Puedes responder por texto o usar el micrófono." />}
    </div>
  </div>
}
