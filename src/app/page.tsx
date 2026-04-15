import Link from 'next/link'

export default function Home() {
  return (
    <div className="mesh-bg min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎓</span>
          <span className="font-bold text-white">Alex</span>
          <span className="badge badge-purple ml-1">Beta</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost text-sm py-2 px-4">
            Entrar
          </Link>
          <Link href="/signup" className="btn-primary text-sm py-2 px-4">
            Empezar gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm mb-8">
          <span>✨</span>
          Método Augusto Ghio + IA Adaptativa
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight max-w-3xl">
          El tutor de inglés
          <br />
          <span className="gradient-text">que te conoce.</span>
        </h1>

        <p className="mt-6 text-lg text-white/50 max-w-xl leading-relaxed">
          No más apps genéricas. Alex aprende tus debilidades, adapta las lecciones
          a ti y te lleva de A2 a inglés profesional en semanas, no años.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
          <Link href="/signup" className="btn-primary px-8 py-3 text-base">
            Empezar gratis — $0/mes
          </Link>
          <Link href="/login" className="btn-ghost px-8 py-3 text-base">
            Ya tengo cuenta
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-20 max-w-3xl w-full">
          {[
            {
              icon: '🧠',
              title: 'Método Ghio',
              desc: '850 palabras + 16 verbos = inglés completo. El sistema más eficiente jamás creado.',
            },
            {
              icon: '🎯',
              title: 'Adaptativo',
              desc: 'Alex analiza tus errores y prioriza exactamente lo que necesitas mejorar.',
            },
            {
              icon: '🎙️',
              title: 'Voz + Texto',
              desc: 'Practica hablando en voz alta. Alex te escucha y responde en inglés.',
            },
          ].map(f => (
            <div key={f.title} className="glass-card p-5 text-left">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
