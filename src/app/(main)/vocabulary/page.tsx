import TutorChat from '@/features/tutor/components/TutorChat'

export default function VocabularyPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-white">Vocabulario SRS</h1>
          <span className="badge badge-green">SM-2 Algorithm</span>
        </div>
        <p className="text-sm text-white/40">850 palabras del método Ghio + vocabulario profesional. Repaso inteligente.</p>
      </div>
      <div className="flex-1 overflow-hidden">
        <TutorChat
          mode="vocabulary"
          initialMessage={`Welcome to your **Vocabulary Review**! 🃏

I'll practice words with you using the **Ghio phonetic method** — each word shows:
- The word in English
- Its phonetic pronunciation in parentheses
- Its Spanish translation
- An example sentence
- Its opposite word (when applicable)

**Important rule from Ghio:** Learn word pairs together!
• Good (gúd) = Bueno ↔ Bad (bad) = Malo
• Man (man) = Hombre ↔ Woman (úuman) = Mujer
• White (juáit) = Blanco ↔ Black (blak) = Negro

Let's start! I'll give you a word — you give me the translation and use it in a sentence.

**First word:** *work* (uéeRk) — What does it mean and give me a sentence with it!`}
          placeholder="Escribe la traducción o haz una oración..."
        />
      </div>
    </div>
  )
}
