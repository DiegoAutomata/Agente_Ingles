import CorrectionBoard from '@/features/writing/components/CorrectionBoard'

export default function WritingPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-white">Writing Coach</h1>
          <span className="badge badge-purple">Alex te corrige</span>
        </div>
        <p className="text-sm text-white/40">
          Escribí en inglés — Alex identifica cada error con su regla de gramática.
        </p>
      </div>
      <CorrectionBoard />
    </div>
  )
}
