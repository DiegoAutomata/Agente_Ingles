import ConversationPractice from '@/features/tutor/components/ConversationPractice'

export default function ConversationPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-white/5">
        <h1 className="font-bold text-white">Conversación con Alex</h1>
        <p className="text-sm text-white/40">Practica en inglés por texto o micrófono y revisa tus correcciones al terminar.</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <ConversationPractice />
      </div>
    </div>
  )
}
