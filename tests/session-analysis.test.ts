import { expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ rpc: vi.fn(async () => ({ error: { message: 'save failed' } })), generate: vi.fn(async () => ({ object: { errors: [], wins: [], vocabulary_used: [], vocabulary_struggling: [], updated_weaknesses: [], updated_strengths: [], ai_notes: '', week_summary: '' } })) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => {
  const builder = { insert: () => builder, update: () => builder, select: () => builder, eq: () => builder, single: async () => ({data: null}), then: (resolve: (value: unknown) => unknown) => Promise.resolve({data: null, error: {message:'save failed'}}).then(resolve) }
  return { auth: { getUser: async () => ({ data: { user: { id: 'a' } } }) }, rpc: mocks.rpc, from: () => builder }
} }))
vi.mock('ai', () => ({ generateObject: mocks.generate }))
import { POST } from '@/app/api/analyze-session/route'
it('never reports updated profile after a failed transaction', async () => {
  process.env.GROQ_API_KEY = 'test'
  const response = await POST(new Request('http://localhost/api/analyze-session', { method: 'POST', body: JSON.stringify({ session_id: 'conversation-test', transcript: [{role:'assistant',content:'Hello'},{role:'user',content:'Hi'}] }) }))
  expect(response.status).toBe(500)
  expect(await response.json()).toMatchObject({ ok: false })
})
