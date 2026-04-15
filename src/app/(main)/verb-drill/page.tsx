import TutorChat from '@/features/tutor/components/TutorChat'

export default function VerbDrillPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-white">Los 16 Verbos Básicos</h1>
          <span className="badge badge-purple">Ghio Method</span>
        </div>
        <p className="text-sm text-white/40">Domina los 16 verbos que reemplazan 4,000 verbos irregulares.</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <TutorChat
          mode="verb_drill"
          initialMessage="Welcome to the **16 Basic Verbs Drill** — the core of the Ghio method! 🎯

These 16 verbs replace 4,000 irregular English verbs. Master them and you can express *everything*.

**The 16 verbs:**
come · let · go · put · take · give · get · keep · make · do · seem · say · see · send · be · have

Let's start! I'll give you a Spanish sentence and you translate it using the correct verb form.

Ready? Here's the first one:
**'Yo voy al trabajo todos los días.'** → Translate to English!"
          placeholder="Traduce la frase al inglés..."
        />
      </div>
    </div>
  )
}
