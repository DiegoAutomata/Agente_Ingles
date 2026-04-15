'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/dashboard`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="glass-card w-full max-w-md p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-green-500/20 border border-green-500/30 mb-4">
          <span className="text-2xl">✉️</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Revisa tu email</h2>
        <p className="text-white/50 text-sm">
          Te enviamos un link de confirmación a <span className="text-white/80">{email}</span>.
          Haz click en el link para activar tu cuenta y empezar con Alex.
        </p>
        <Link href="/login" className="btn-ghost mt-6 inline-flex">
          Ir al login
        </Link>
      </div>
    )
  }

  return (
    <div className="glass-card w-full max-w-md p-8">
      {/* Logo / Título */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/30 mb-4">
          <span className="text-2xl">🎓</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Empieza a aprender</h1>
        <p className="text-white/50 mt-1 text-sm">Gratis. Sin tarjeta. Empieza hoy.</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm text-white/60 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@email.com"
            required
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-1.5">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            required
            minLength={6}
            className="input-field"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full mt-2"
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta gratis'}
        </button>
      </form>

      <p className="text-center text-sm text-white/40 mt-6">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-violet-400 hover:text-violet-300 transition-colors">
          Entrar
        </Link>
      </p>
    </div>
  )
}
