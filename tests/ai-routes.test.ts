import { beforeEach, describe, expect, it, vi } from 'vitest'

const deps = vi.hoisted(() => ({ user: null as null | { id: string }, generate: vi.fn(), stream: vi.fn(), insert: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: deps.user } }) },
  from: () => ({ insert: deps.insert, select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }) }),
}) }))
vi.mock('ai', () => ({ generateObject: deps.generate, streamText: deps.stream, convertToModelMessages: vi.fn(async x => x) }))
import { POST as writing } from '@/app/api/writing-coach/route'
import { POST as tutor } from '@/app/api/tutor/route'

beforeEach(() => { vi.clearAllMocks(); deps.user = null; process.env.GROQ_API_KEY = 'test'; deps.generate.mockResolvedValue({ object: { summary: 'Bien', correctedText: 'Hello', overallScore: 8 } }); deps.insert.mockResolvedValue({ error: null }) })
const request = (body: unknown) => new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body) })
describe('AI public HTTP contracts', () => {
  it('rejects anonymous writing before invoking AI', async () => {
    expect((await writing(request({ text: 'Hello' }))).status).toBe(401)
    expect(deps.generate).not.toHaveBeenCalled()
  })
  it('rejects anonymous tutor requests before invoking AI', async () => {
    expect((await tutor(request({ messages: [{ id: '1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }] }))).status).toBe(401)
    expect(deps.stream).not.toHaveBeenCalled()
  })
  it('persists free writing with a non-null prompt', async () => {
    deps.user = { id: 'user-a' }
    expect((await writing(request({ text: 'Hello' }))).status).toBe(200)
    expect(deps.insert).toHaveBeenCalledWith(expect.objectContaining({ prompt: 'Escritura libre', user_id: 'user-a' }))
  })
  it('does not report saved feedback when persistence fails', async () => {
    deps.user = { id: 'user-a' }; deps.insert.mockResolvedValue({ error: { message: 'offline' } })
    expect((await writing(request({ text: 'Hello' }))).status).toBe(500)
  })
  it('rejects invalid writing input', async () => {
    deps.user = { id: 'user-a' }
    expect((await writing(request({ text: 123 }))).status).toBe(400)
  })
})
