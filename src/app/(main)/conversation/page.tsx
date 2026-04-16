import VoiceConversation from '@/features/tutor/components/VoiceConversation'

export default function ConversationPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-white/5">
        <h1 className="font-bold text-white">Conversación con Alex</h1>
        <p className="text-sm text-white/40">Alex te habla, vos respondés en inglés. Sin teclado.</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <VoiceConversation
          mode="voice_conversation"
          initialMessage="Hola, soy Alex, tu tutor de inglés. Te voy a hablar en español para que entiendas todo, pero respondeme en inglés. ¿Listo para practicar? Contame: ¿a qué te dedicás en tu trabajo?"
        />
      </div>
    </div>
  )
}
