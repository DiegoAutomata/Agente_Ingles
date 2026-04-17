import VerbArena from '@/features/verb-drill/components/VerbArena'

export default function VerbDrillPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-white">Los 16 Verbos Básicos</h1>
          <span className="badge badge-purple">Método Ghio</span>
        </div>
        <p className="text-sm text-white/40">
          Domina los 16 verbos que reemplazan 4,000 verbos irregulares.
        </p>
      </div>
      <VerbArena />
    </div>
  )
}
