import TutorChat from '@/features/tutor/components/TutorChat'

export default function ConversationPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-white/5">
        <h1 className="font-bold text-white">Conversación Libre</h1>
        <p className="text-sm text-white/40">Practica hablando en inglés. Alex te corrige en tiempo real.</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <TutorChat
          mode="conversation"
          initialMessage="Hello! I'm Alex, your personal English tutor. Let's practice speaking!

You can type or click the 🎙️ microphone to speak. I'll correct your mistakes naturally as we talk.

Tell me: what do you do for work? Try to answer in English — don't worry about mistakes, that's what I'm here for! 😊"
          placeholder="Escribe en inglés... o usa el micrófono 🎙️"
        />
      </div>
    </div>
  )
}
