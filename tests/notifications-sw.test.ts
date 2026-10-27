import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

function worker(response: { ok: boolean; json: () => Promise<unknown> }) {
  const handlers: Record<string, (event: unknown) => void> = {}
  const client = { postMessage: vi.fn(), focus: vi.fn(), navigate: vi.fn() }
  const fetch = vi.fn(async () => response)
  const subscription = { toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/device', keys: { auth: 'a', p256dh: 'b' } }) }
  const context = {
    URL, fetch, caches: { keys: async () => [] },
    self: {
      location: { origin: 'https://app.example' },
      addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler },
      registration: { pushManager: { subscribe: vi.fn(async () => subscription) } },
      clients: { matchAll: vi.fn(async () => [client]), openWindow: vi.fn(), claim: vi.fn() },
    },
  }
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), context)
  return { handlers, client, fetch }
}

describe('notification service worker events', () => {
  it('reports renewal persistence failure to clients instead of silently accepting HTTP 500', async () => {
    const { handlers, client } = worker({ ok: false, json: async () => ({ error: 'DB unavailable' }) })
    let pending: Promise<unknown> = Promise.resolve()
    handlers.pushsubscriptionchange({
      oldSubscription: { endpoint: 'https://fcm.googleapis.com/old', options: { applicationServerKey: new Uint8Array([1]), userVisibleOnly: true } },
      waitUntil: (promise: Promise<unknown>) => { pending = promise },
    })
    await pending
    expect(client.postMessage).toHaveBeenCalledWith({ type: 'PUSH_SUBSCRIPTION_CHANGED', ok: false })
  })
  it('keeps notification clicks on the application origin', async () => {
    const { handlers, client } = worker({ ok: true, json: async () => ({ success: true }) })
    let pending: Promise<unknown> = Promise.resolve()
    handlers.notificationclick({
      notification: { close: vi.fn(), data: { url: 'https://outside.example/phishing' } },
      waitUntil: (promise: Promise<unknown>) => { pending = promise },
    })
    await pending
    expect(client.navigate).toHaveBeenCalledWith('https://app.example/dashboard')
  })
})
