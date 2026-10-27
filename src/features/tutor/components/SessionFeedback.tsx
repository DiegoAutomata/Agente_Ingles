import type { SessionFeedback as Feedback } from '../hooks/useSessionAnalysis'

export default function SessionFeedback({ feedback }: { feedback: Feedback | null }) {
  if (!feedback) return null
  return <section className="glass-card p-4 mx-4 my-2 text-sm space-y-2" aria-label="Resumen de la sesión">
    <h2 className="font-semibold text-green-300">Sesión guardada</h2>
    {feedback.wins?.slice(0, 2).map((win, i) => <p key={i}>{win}</p>)}
    {feedback.errors?.slice(0, 3).map((error, i) => <div key={i} className="border-t border-white/10 pt-2">
      <p><span className="text-red-300">{error.user_attempt}</span> → <span className="text-green-300">{error.correct_form}</span></p>
      <p className="text-white/60">{error.pattern}</p>
    </div>)}
    {feedback.errors?.length === 0 && <p>No se detectaron errores en este intercambio.</p>}
  </section>
}
