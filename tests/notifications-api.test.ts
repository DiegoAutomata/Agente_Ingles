import { beforeEach, describe, expect, it, vi } from 'vitest'

const deps = vi.hoisted(() => ({ getUser: vi.fn(), admin: vi.fn(), send: vi.fn(), upsert: vi.fn(), remove: vi.fn(), query: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: deps.getUser } }) }))
vi.mock('@supabase/supabase-js', () => ({ createClient: deps.admin }))
vi.mock('web-push', () => ({ default: { setVapidDetails: vi.fn(), sendNotification: deps.send } }))
import { POST as subscribe, DELETE as unsubscribe } from '@/app/api/notifications/subscribe/route'
import { POST as send } from '@/app/api/notifications/send/route'
import { GET as reminder } from '@/app/api/notifications/streak-reminder/route'

const request = (body: unknown, token?: string) => new Request('http://localhost/api/notifications', {
  method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {},
  body: JSON.stringify(body),
})

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
  delete process.env.CRON_SECRET
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server-secret')
  vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'public-key')
  vi.stubEnv('VAPID_PRIVATE_KEY', 'private-key')
  deps.upsert.mockResolvedValue({ data: { id: 'subscription-1' }, error: null })
  deps.remove.mockResolvedValue({ error: null })
  deps.query.mockResolvedValue({ data: [], error: null })
  deps.admin.mockReturnValue({ from: () => ({
    upsert: (...args: unknown[]) => {
      const result = deps.upsert(...args)
      return { select: () => ({ single: () => result }) }
    },
    select: () => {
      const query = { eq: () => query, in: () => query, lt: () => query, gt: () => query, single: () => deps.query(), then: (resolve: (v: unknown) => unknown) => deps.query().then(resolve) }
      return query
    },
    update: () => ({ eq: async () => ({ error: null }) }),
    delete: () => {
      const query = { eq: () => query, in: () => query, then: (resolve: (v: unknown) => unknown) => deps.remove().then(resolve) }
      return query
    },
  }) })
  deps.getUser.mockResolvedValue({ data: { user: { id: 'user-a' } }, error: null })
})

const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/device-1', keys: { p256dh: 'a'.repeat(87), auth: 'b'.repeat(22) } }

describe('notification HTTP contracts', () => {
  it('rejects malformed notification payloads before looking up devices', async () => {
    expect((await send(request({ userId: 'invalid', notification: { title: '' } }, 'server-secret'))).status).toBe(400)
    expect(deps.query).not.toHaveBeenCalled()
    expect(deps.send).not.toHaveBeenCalled()
  })
  it('requires an actual secret match for administrative delivery', async () => {
    expect((await send(request({}, 'wrong-secret'))).status).toBe(401)
    expect(deps.send).not.toHaveBeenCalled()
    expect(deps.admin).not.toHaveBeenCalled()
  })
  it('rejects delivery when VAPID is not configured', async () => {
    delete process.env.VAPID_PRIVATE_KEY
    expect((await send(request({ userId: 'a2876a49-99c0-4b80-9bf8-5d1fb3ec192f', notification: { title: 'test' } }, 'server-secret'))).status).toBe(503)
    expect(deps.send).not.toHaveBeenCalled()
  })
  it('does not report unsubscribe success when the database rejects deletion', async () => {
    deps.remove.mockResolvedValue({ error: { message: 'DB unavailable' } })
    expect((await unsubscribe(request({ endpoint: subscription.endpoint }))).status).toBe(500)
  })
  it('keeps a subscription after a transient network error and reports failed delivery', async () => {
    deps.query.mockResolvedValue({ data: [{ id: 'sub-1', ...subscription, ...subscription.keys }], error: null })
    deps.send.mockRejectedValue(new Error('Network offline'))
    const response = await send(request({ userId: 'a2876a49-99c0-4b80-9bf8-5d1fb3ec192f', notification: { title: 'test' } }, 'server-secret'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ sent: 0, failed: 1 })
    expect(deps.remove).not.toHaveBeenCalled()
  })
  it('removes an expired endpoint after the push service returns 410', async () => {
    deps.query.mockResolvedValue({ data: [{ id: 'sub-1', ...subscription, ...subscription.keys }], error: null })
    deps.send.mockRejectedValue({ statusCode: 410 })
    const response = await send(request({ userId: 'a2876a49-99c0-4b80-9bf8-5d1fb3ec192f', notification: { title: 'test' } }, 'server-secret'))
    expect(response.status).toBe(200)
    expect(deps.remove).toHaveBeenCalledTimes(1)
  })

  it('requires a session before persisting a device', async () => {
    deps.getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect((await subscribe(request({ subscription }))).status).toBe(401)
    expect(deps.upsert).not.toHaveBeenCalled()
  })
  it('rejects malformed subscriptions and unsupported endpoints', async () => {
    expect((await subscribe(request({ subscription: { ...subscription, keys: null } }))).status).toBe(400)
    expect((await subscribe(request({ subscription: { ...subscription, endpoint: 'http://localhost/internal' } }))).status).toBe(400)
    expect(deps.upsert).not.toHaveBeenCalled()
  })
  it('binds an existing browser endpoint to the authenticated account rather than trusting a supplied user id', async () => {
    const response = await subscribe(request({ subscription, userId: 'someone-else' }))
    expect(response.status).toBe(200)
    expect(deps.upsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user-a', endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth,
    }), { onConflict: 'endpoint' })
  })
  it('does not claim subscription success when persistence fails', async () => {
    deps.upsert.mockResolvedValue({ data: null, error: { message: 'DB unavailable' } })
    expect((await subscribe(request({ subscription }))).status).toBe(500)
  })
  it('returns a server failure when reminder recipient lookup fails', async () => {
    deps.query.mockResolvedValue({ data: null, error: { message: 'DB unavailable' } })
    expect((await reminder(request({}, 'server-secret'))).status).toBe(500)
    expect(deps.send).not.toHaveBeenCalled()
  })
  it('returns a server failure when send subscription lookup fails', async () => {
    deps.query.mockResolvedValue({ data: null, error: { message: 'DB unavailable' } })
    expect((await send(request({ userId: 'a2876a49-99c0-4b80-9bf8-5d1fb3ec192f', notification: { title: 'test' } }, 'server-secret'))).status).toBe(500)
    expect(deps.send).not.toHaveBeenCalled()
  })
  it('rejects missing server secrets even when the caller sends Bearer undefined', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const response = await send(request({ userId: 'user-a', notification: { title: 'test' } }, 'undefined'))
    expect(response.status).toBe(503)
    expect(deps.admin).not.toHaveBeenCalled()
    expect(deps.send).not.toHaveBeenCalled()
    const cronResponse = await reminder(request({}, 'undefined'))
    expect(cronResponse.status).toBe(503)
    expect(deps.send).not.toHaveBeenCalled()
  })
})
