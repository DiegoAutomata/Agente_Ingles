// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ForgotPasswordPage from '../src/app/(auth)/forgot-password/page'
import UpdatePasswordPage from '../src/app/(auth)/update-password/page'

const auth = vi.hoisted(() => ({ resetPasswordForEmail: vi.fn(), getUser: vi.fn(), updateUser: vi.fn() }))
vi.mock('@supabase/ssr', () => ({ createBrowserClient: () => ({ auth }) }))
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))

afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key')
  auth.resetPasswordForEmail.mockResolvedValue({ error: null })
  auth.getUser.mockResolvedValue({ data: { user: { id: 'student' } }, error: null })
  auth.updateUser.mockResolvedValue({ error: null })
})

function requestRecovery() {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'student@example.com' } })
  fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))
}

describe('password recovery email', () => {
  it('requests a PKCE link that opens the new-password screen after confirmation', async () => {
    render(<ForgotPasswordPage />)
    requestRecovery()
    expect((await screen.findByRole('status')).textContent).toMatch(/si existe una cuenta/i)
    const [email, options] = auth.resetPasswordForEmail.mock.calls[0]
    expect(email).toBe('student@example.com')
    expect(options.redirectTo).toBe('http://localhost:3000/auth/callback?next=%2Fupdate-password')
  })

  it.each(['returned', 'network'])('allows retry after a %s failure', async (failure) => {
    if (failure === 'network') auth.resetPasswordForEmail.mockRejectedValueOnce(new Error('network'))
    else auth.resetPasswordForEmail.mockResolvedValueOnce({ error: { message: 'rate limit' } })
    render(<ForgotPasswordPage />)
    requestRecovery()
    expect((await screen.findByRole('alert')).textContent).toMatch(/inténtalo de nuevo/i)
    expect((screen.getByRole('button', { name: 'Enviar enlace' }) as HTMLButtonElement).disabled).toBe(false)
  })
})

async function submitNewPassword(confirm = 'new-password') {
  const password = await screen.findByLabelText('Nueva contraseña')
  fireEvent.change(password, { target: { value: 'new-password' } })
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: confirm } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
}

describe('new password', () => {
  it('saves the password after verifying the recovery session', async () => {
    render(<UpdatePasswordPage />)
    await submitNewPassword()
    expect((await screen.findByRole('status')).textContent).toMatch(/contraseña se actualizó/i)
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new-password' })
    expect(screen.getByRole('link', { name: 'Continuar aprendiendo' }).getAttribute('href')).toBe('/dashboard')
  })

  it('does not accept a mismatched confirmation', async () => {
    render(<UpdatePasswordPage />)
    await submitNewPassword('different-password')
    expect((await screen.findByRole('alert')).textContent).toMatch(/no coinciden/i)
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('rejects a missing or expired recovery session', async () => {
    auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })
    render(<UpdatePasswordPage />)
    expect((await screen.findByRole('alert')).textContent).toMatch(/enlace.*(venció|válido)/i)
    expect(screen.queryByLabelText('Nueva contraseña')).toBeNull()
    expect(screen.getByRole('link', { name: 'Solicitar otro enlace' }).getAttribute('href')).toBe('/forgot-password')
  })

  it.each(['returned', 'network'])('keeps the form retryable after a %s password update failure', async (failure) => {
    if (failure === 'network') auth.updateUser.mockRejectedValueOnce(new Error('network'))
    else auth.updateUser.mockResolvedValueOnce({ error: { message: 'La contraseña no cumple la política de seguridad.' } })
    render(<UpdatePasswordPage />)
    await submitNewPassword()
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Guardar contraseña' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('explains a failure while validating the recovery session', async () => {
    auth.getUser.mockRejectedValueOnce(new Error('network'))
    render(<UpdatePasswordPage />)
    expect((await screen.findByRole('alert')).textContent).toMatch(/validar el enlace/i)
    expect(screen.queryByLabelText('Nueva contraseña')).toBeNull()
  })
})
