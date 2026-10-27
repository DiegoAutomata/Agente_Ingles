import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../src/app/auth/callback/route'

const auth = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn(), cookies: [] as { name: string; value: string }[] }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: typeof auth.cookies) => void } }) => {
    options.cookies.setAll(auth.cookies)
    return { auth }
  },
}))

describe('confirmation callback', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key')
    auth.cookies = []
    auth.exchangeCodeForSession.mockResolvedValue({ error: null })
  })

  it('rejects a destination that would turn the origin into user information', async () => {
    const response = await GET(new NextRequest('https://learn.example/auth/callback?code=valid&next=%40evil.example'))
    expect(response.headers.get('location')).toBe('https://learn.example/dashboard')
  })
  it('returns a visible login error when code exchange is unavailable', async () => {
    auth.exchangeCodeForSession.mockRejectedValueOnce(new Error('network unavailable'))
    const response = await GET(new NextRequest('https://learn.example/auth/callback?code=valid'))
    expect(response.headers.get('location')).toBe('https://learn.example/login?error=auth_callback_failed')
  })
  it('puts session cookies on the redirect to the recovery screen', async () => {
    auth.cookies = [{ name: 'sb-session', value: 'confirmed-session' }]
    const response = await GET(new NextRequest('https://learn.example/auth/callback?code=valid&next=%2Fupdate-password'))
    expect(response.headers.get('location')).toBe('https://learn.example/update-password')
    expect(response.cookies.get('sb-session')?.value).toBe('confirmed-session')
  })

  it('explains missing configuration instead of attempting session exchange', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    const response = await GET(new NextRequest('https://learn.example/auth/callback?code=valid'))
    expect(response.headers.get('location')).toBe('https://learn.example/login?error=auth_not_configured')
  })

  it.each(['/\t/evil.example', '//evil.example', '/\\evil.example', 'https://evil.example'])('keeps unsafe destination %s internal', async (next) => {
    const response = await GET(new NextRequest('https://learn.example/auth/callback?code=valid&next=' + encodeURIComponent(next)))
    expect(response.headers.get('location')).toBe('https://learn.example/dashboard')
  })

  it('keeps an internal destination and query', async () => {
    const response = await GET(new NextRequest('https://learn.example/auth/callback?code=valid&next=%2Flesson%3Funit%3D2'))
    expect(response.headers.get('location')).toBe('https://learn.example/lesson?unit=2')
  })

  it('rejects an expired or missing confirmation code', async () => {
    auth.exchangeCodeForSession.mockResolvedValueOnce({ error: new Error('expired') })
    for (const suffix of ['?code=expired', '']) {
      const response = await GET(new NextRequest('https://learn.example/auth/callback' + suffix))
      expect(response.headers.get('location')).toBe('https://learn.example/login?error=auth_callback_failed')
    }
  })
})
