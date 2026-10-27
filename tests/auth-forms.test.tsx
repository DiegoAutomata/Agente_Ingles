// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import SignupPage from '../src/app/(auth)/signup/page'
import LoginPage from '../src/app/(auth)/login/page'

const auth = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
}))
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }))
vi.mock('@supabase/ssr', () => ({ createBrowserClient: () => ({ auth }) }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))

afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState({}, '', '/login')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key')
  auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
  auth.signInWithPassword.mockResolvedValue({ data: { session: { user: { id: 'student' } } }, error: null })
  auth.signInWithOAuth.mockResolvedValue({ data: {}, error: null })
})

function submitSignup() {
  fireEvent.change(screen.getByPlaceholderText('tu@email.com'), { target: { value: 'student@example.com' } })
  fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), { target: { value: 'safe-password' } })
  fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta gratis' }))
}

describe('sign up', () => {
  it('confirms email through the PKCE callback and asks the student to check email', async () => {
    render(<SignupPage />)
    submitSignup()
    expect(await screen.findByText('Revisa tu email')).toBeTruthy()
    expect(auth.signUp.mock.calls[0][0].options.emailRedirectTo).toBe('http://localhost:3000/auth/callback')
  })

  it('opens the dashboard immediately when confirmation is disabled', async () => {
    auth.signUp.mockResolvedValueOnce({ data: { session: { user: { id: 'student' } } }, error: null })
    render(<SignupPage />)
    submitSignup()
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/dashboard'))
    expect(router.refresh).toHaveBeenCalled()
    expect(screen.queryByText('Revisa tu email')).toBeNull()
  })
})

describe('retryable sign-in failures', () => {
  it.each([LoginPage, SignupPage])('shows OAuth provider errors and enables another attempt', async (Page) => {
    auth.signInWithOAuth.mockResolvedValueOnce({ error: { message: 'provider unavailable' } })
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/Google/)
    expect((screen.getByRole('button', { name: 'Continuar con Google' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('lets the student retry when email login rejects on the network', async () => {
    auth.signInWithPassword.mockRejectedValueOnce(new Error('network unavailable'))
    render(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), { target: { value: 'student@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'safe-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/inténtalo de nuevo/i)
    expect((screen.getByRole('button', { name: 'Entrar' }) as HTMLButtonElement).disabled).toBe(false)
    expect(router.push).not.toHaveBeenCalled()
  })

  it('lets the student retry when sign up rejects on the network', async () => {
    auth.signUp.mockRejectedValueOnce(new Error('network unavailable'))
    render(<SignupPage />)
    submitSignup()
    expect((await screen.findByRole('alert')).textContent).toMatch(/inténtalo de nuevo/i)
    expect((screen.getByRole('button', { name: 'Crear cuenta gratis' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('explains missing configuration on sign in', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/configurar Supabase/i)
  })

  it('shows callback failures and a way to request another recovery email', async () => {
    window.history.replaceState({}, '', '/login?error=auth_callback_failed')
    render(<LoginPage />)
    expect((await screen.findByRole('alert')).textContent).toMatch(/enlace/i)
    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).getAttribute('href')).toBe('/forgot-password')
  })

  it('completes an email login', async () => {
    render(<LoginPage />)
    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), { target: { value: 'student@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'safe-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/dashboard'))
    expect(router.refresh).toHaveBeenCalled()
  })
})

describe('provider and credential errors', () => {
  it.each([LoginPage, SignupPage])('recovers from a rejected OAuth request', async (Page) => {
    auth.signInWithOAuth.mockRejectedValueOnce(new Error('network unavailable'))
    render(<Page />)
    fireEvent.click(screen.getByRole('button', { name: 'Continuar con Google' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/Google/)
    expect((screen.getByRole('button', { name: 'Continuar con Google' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows invalid credentials without entering the private area', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid credentials' } })
    render(<LoginPage />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'student@example.com' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/contraseña incorrectos/i)
    expect(router.push).not.toHaveBeenCalled()
  })
})
