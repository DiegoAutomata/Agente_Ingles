'use client'

import { useState } from 'react'
import Link from 'next/link'
import { authFailureMessage, createAuthClient } from '@/lib/auth/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function requestRecovery(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const redirect = new URL('/auth/callback', location.origin)
      redirect.searchParams.set('next', '/update-password')
      const { error } = await createAuthClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirect.toString(),
      })
      if (error) {
        setError('No pudimos enviar el enlace. Inténtalo de nuevo en unos minutos.')
        return
      }
      setSent(true)
    } catch (error) {
      setError(authFailureMessage(error, 'No pudimos enviar el enlace. Inténtalo de nuevo.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card w-full max-w-md p-8">
      <h1 className="text-2xl font-bold text-white mb-2">Recuperar contraseña</h1>
      <p className="text-white/50 text-sm mb-6">Te enviaremos un enlace para elegir una contraseña nueva.</p>
      {sent ? (
        <p role="status" className="text-sm text-green-300 bg-green-500/10 rounded-lg p-3">
          Si existe una cuenta con ese email, recibirás un enlace para recuperar tu contraseña. Revisa también spam.
        </p>
      ) : (
        <form onSubmit={requestRecovery} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-white/60 mb-1.5">Email</label>
            <input id="email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required className="input-field" />
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>
      )}
      <Link href="/login" className="block text-center text-sm text-violet-400 hover:text-violet-300 mt-6">Volver al acceso</Link>
    </div>
  )
}
