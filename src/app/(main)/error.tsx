'use client'
import Link from 'next/link'
export default function AppError({ reset }: { reset: () => void }) {
  return <div role="alert" className="p-6 max-w-lg mx-auto space-y-4">
    <h1 className="text-xl font-bold">No pudimos cargar tus datos</h1>
    <p>Comprueba la conexión e inténtalo de nuevo. Si continúa, vuelve a iniciar sesión.</p>
    <button className="btn-primary" onClick={reset}>Reintentar</button>
    <Link className="btn-ghost" href="/login">Iniciar sesión</Link>
  </div>
}
