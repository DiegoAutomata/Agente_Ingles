// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import VocabularyPage from '../src/app/(main)/vocabulary/page'

const db = vi.hoisted(() => ({ auth: vi.fn(), vocabulary: vi.fn(), progress: vi.fn() }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: db.auth },
    from: (table: string) => ({
      select: () => ({
        order: db.vocabulary,
        eq: db.progress,
      }),
    }),
  }),
}))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }))

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key')
  db.auth.mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null })
  db.vocabulary.mockResolvedValue({ data: [], error: null })
  db.progress.mockResolvedValue({ data: [], error: null })
})
afterEach(() => { cleanup(); vi.unstubAllEnvs() })

describe('vocabulary page data', () => {
  it('shows a load error without presenting fallback words as real progress', async () => {
    db.vocabulary.mockResolvedValue({ data: null, error: { code: '08006' } })
    render(await VocabularyPage())
    expect(screen.getByRole('alert').textContent).toContain('No se pudo cargar')
    expect(screen.queryByRole('button', { name: /Empezar repaso/ })).toBeNull()
    expect(screen.queryByText('16 tarjetas')).toBeNull()
  })

  it('shows an honest empty state for an empty database', async () => {
    render(await VocabularyPage())
    expect(screen.getByText('Todavía no hay palabras disponibles')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Empezar repaso/ })).toBeNull()
  })

  it('does not mark all words new when loading existing progress fails', async () => {
    db.vocabulary.mockResolvedValue({ data: [{ id: 1, word: 'hello', phonetic: '(jelou)', translation: 'hola', example_en: null, example_es: null }], error: null })
    db.progress.mockResolvedValue({ data: null, error: { code: '08006' } })
    render(await VocabularyPage())
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Empezar repaso/ })).toBeNull()
  })
})
