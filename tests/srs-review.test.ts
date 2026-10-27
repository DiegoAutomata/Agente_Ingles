import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../src/app/api/srs-review/route'

const db = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn() }))
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: db.auth }, rpc: db.rpc }),
}))
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [], set: vi.fn() }) }))

function request(payload: unknown) {
  return new Request('http://localhost/api/srs-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
const firstReview = {
  word_id: 3, srs_interval: 1, srs_repetitions: 1, srs_ease_factor: 2.5,
  next_review_at: '2026-10-28T12:00:00Z', mastered: false,
}
const secondReview = { ...firstReview, srs_interval: 6, srs_repetitions: 2, next_review_at: '2026-11-02T12:00:00Z' }

describe('SRS review API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key')
    db.auth.mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null })
    db.rpc.mockResolvedValue({ data: firstReview, error: null })
  })

  it('does not claim a review was saved when the transaction fails', async () => {
    db.rpc.mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'transaction failed' } })
    const response = await POST(request({ wordId: 3, quality: 2 }))
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ ok: false })
  })

  it('returns persisted progress from consecutive atomic reviews', async () => {
    db.rpc.mockResolvedValueOnce({ data: firstReview, error: null })
      .mockResolvedValueOnce({ data: secondReview, error: null })
    expect((await POST(request({ wordId: 3, quality: 2 }))).status).toBe(200)
    const second = await POST(request({ wordId: 3, quality: 2 }))
    expect(second.status).toBe(200)
    expect(await second.json()).toEqual({
      ok: true,
      review: { wordId: 3, interval: 6, repetitions: 2, easeFactor: 2.5, nextReviewAt: '2026-11-02T12:00:00Z', mastered: false },
    })
    expect(db.rpc).toHaveBeenCalledWith('review_vocabulary', { word_id_param: 3, quality_param: 2 })
  })

  it.each([
    { wordId: 0, quality: 2 }, { wordId: -1, quality: 2 },
    { wordId: 1.5, quality: 2 }, { wordId: '3', quality: 2 },
    { wordId: 3, quality: -1 }, { wordId: 3, quality: 4 },
    { wordId: 3, quality: 1.5 }, { wordId: 3, quality: '2' }, {},
  ])('rejects invalid review input with 400: %j', async (payload) => {
    const response = await POST(request(payload))
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ ok: false })
    expect(db.rpc).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON with 400', async () => {
    const response = await POST(new Request('http://localhost/api/srs-review', { method: 'POST', body: '{' }))
    expect(response.status).toBe(400)
    expect(db.rpc).not.toHaveBeenCalled()
  })

  it('requires a verified authenticated user', async () => {
    db.auth.mockResolvedValueOnce({ data: { user: null }, error: null })
    const response = await POST(request({ wordId: 3, quality: 2 }))
    expect(response.status).toBe(401)
    expect(db.rpc).not.toHaveBeenCalled()
  })

  it('does not fabricate progress when the database is unavailable', async () => {
    db.rpc.mockResolvedValueOnce({ data: null, error: { code: '08006' } })
    const response = await POST(request({ wordId: 3, quality: 2 }))
    expect(response.status).toBe(500)
    expect(await response.json()).toMatchObject({ ok: false })
  })

  it('returns 404 when the reviewed word no longer exists', async () => {
    db.rpc.mockResolvedValueOnce({ data: null, error: { code: '23503' } })
    const response = await POST(request({ wordId: 999, quality: 2 }))
    expect(response.status).toBe(404)
  })

  it('does not report success without returned persisted progress', async () => {
    db.rpc.mockResolvedValueOnce({ data: null, error: null })
    const response = await POST(request({ wordId: 3, quality: 2 }))
    expect(response.status).toBe(500)
  })
})
