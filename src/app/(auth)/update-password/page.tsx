'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authFailureMessage, createAuthClient } from '@/lib/auth/client'

export default function UpdatePasswordPage() {
  const [checking, setChecking] = useState(true)
  const [canUpdate, setCanUpdate] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function verifyLink() {
      try {
        const { data: { user }, error } = await createAuthClient().auth.getUser()
        if (!active) return
        if (error || !user) {
          setError('El enlace venció o no es válido. Solicita otro para recuperar tu contraseña.')
        } else {
          setCanUpdate(true)
        }
      } catch (error) {
        if (active) setError(authFailureMessage(error, 'No pudimos validar el enlace. Recarga la página o solicita otro enlace.'))
      } finally {
        if (active) setChecking(false)
      }
    }
    void verifyLink()
    return () => { active = false }
  }, [])

  async function savePassword(event: React.FormEvent) {
    event.preventDefault()
    if (!canUpdate) return
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { error } = await createAuthClient().auth.updateUser({ password })
      if (error) {
        setError(error.message)
        return
      }
      setDone(true)
      setPassword('')
      setConfirmation('')
    } catch (error) {
      setError(authFailureMessage(error, 'No pudimos guardar tu contraseña. Inténtalo de nuevo.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-card w-full max-w-md p-8">
      <h1 className="text-2xl font-bold text-white mb-2">Nueva contraseña</h1>
      <p className="text-white/50 text-sm mb-6">Elige una contraseña de al menos 6 caracteres.</p>
      {checking && <p role="status" className="text-white/60 text-sm">Validando enlace...</p>}
      {error && <p role="alert" className="text-sm text-red-400 mb-4">{error}</p>}
      {done ? (
        <>
          <p role="status" className="text-sm text-green-300">Tu contraseña se actualizó.</p>
          <Link href="/dashboard" className="btn-primary w-full mt-6 inline-flex justify-center">Continuar aprendiendo</Link>
        </>
      ) : canUpdate ? (
        <form onSubmit={savePassword} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm text-white/60 mb-1.5">Nueva contraseña</label>
            <input id="password" type="password" autoComplete="new-password" minLength={6} value={password} onChange={event => setPassword(event.target.value)} required className="input-field" />
          </div>
          <div>
            <label htmlFor="confirmation" className="block text-sm text-white/60 mb-1.5">Confirmar contraseña</label>
            <input id="confirmation" type="password" autoComplete="new-password" minLength={6} value={confirmation} onChange={event => setConfirmation(event.target.value)} required className="input-field" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      ) : !checking && (
        <Link href="/forgot-password" className="text-sm text-violet-400 hover:text-violet-300">Solicitar otro enlace</Link>
      )}
    </div>
  )
}
