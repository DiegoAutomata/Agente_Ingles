import TutorChat from '@/features/tutor/components/TutorChat'

export default function WritingPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-white/5">
        <h1 className="font-bold text-white">Writing Coach</h1>
        <p className="text-sm text-white/40">Escribe emails, propuestas o textos profesionales. Alex los corrige en detalle.</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <TutorChat
          mode="writing"
          initialMessage="Hello! I'm your Writing Coach. 📝

Send me any text in English — an email, a message, a cover letter, or even a simple sentence — and I'll:

1. ✅ Point out grammar and vocabulary mistakes
2. 💡 Explain *why* each correction matters
3. 📋 Give you the corrected version

**Try this exercise:** Write a short email to your boss saying you'll be 15 minutes late to a meeting. Don't worry about mistakes — that's exactly what we're here to fix!"
          placeholder="Pega o escribe tu texto en inglés aquí..."
        />
      </div>
    </div>
  )
}
