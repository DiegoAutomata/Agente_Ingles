import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '../src/middleware'

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  refresh: false,
  unavailable: false,
}))
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: { name: string; value: string; options: { path: string; httpOnly: boolean } }[]) => void } }) => ({
    auth: {
      getUser: async () => {
        if (state.refresh) options.cookies.setAll([{ name: 'sb-session', value: 'refreshed', options: { path: '/', httpOnly: true } }])
        if (state.unavailable) throw new Error('network unavailable')
        return { data: { user: state.user } }
      },
    },
  }),
}))

describe('private page access', () => {
  beforeEach(() => {
    state.user = null
    state.refresh = false
    state.unavailable = false
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key')
  })

  it.each(['/challenge', '/puzzle', '/leaderboard', '/dashboard', '/conversation', '/lesson/2', '/vocabulary', '/writing', '/verb-drill', '/profile'])('requires sign in for %s', async (path) => {
    const response = await middleware(new NextRequest('https://learn.example' + path))
    expect(new URL(response.headers.get('location')!).pathname).toBe('/login')
  })

  it('does not open private pages without Supabase configuration', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    const response = await middleware(new NextRequest('https://learn.example/dashboard'))
    expect(response.headers.get('location')).toBe('https://learn.example/login?error=auth_not_configured')
  })

  it('preserves refreshed session cookies when leaving a sign-in page', async () => {
    state.user = { id: 'student' }
    state.refresh = true
    const response = await middleware(new NextRequest('https://learn.example/login'))
    expect(new URL(response.headers.get('location')!).pathname).toBe('/dashboard')
    expect(response.cookies.get('sb-session')?.value).toBe('refreshed')
    expect(response.cookies.get('sb-session')?.httpOnly).toBe(true)
  })

  it('keeps anonymous access closed on an auth service exception', async () => {
    state.unavailable = true
    const response = await middleware(new NextRequest('https://learn.example/challenge'))
    expect(response.headers.get('location')).toBe('https://learn.example/login?error=auth_unavailable')
  })

  it('uses route boundaries for public pages', async () => {
    const response = await middleware(new NextRequest('https://learn.example/lesson-preview'))
    expect(response.headers.get('location')).toBeNull()
  })
})
