// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { PushNotificationPrompt } from '@/features/notifications/components/PushNotificationPrompt'
import { usePushSubscription } from '@/features/notifications/hooks/usePushSubscription'

const browserSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/device-1',
  toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/device-1', keys: { auth: 'auth-key', p256dh: 'public-key' } }),
  unsubscribe: vi.fn(async () => true),
}
const getSubscription = vi.fn()
const createSubscription = vi.fn()
const fetchMock = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'B'.repeat(87))
  vi.stubGlobal('Notification', { permission: 'granted', requestPermission: vi.fn(async () => 'granted') })
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('fetch', fetchMock)
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    ready: Promise.resolve({ pushManager: { getSubscription, subscribe: createSubscription } }),
  } })
  getSubscription.mockResolvedValue(null)
  createSubscription.mockResolvedValue(browserSubscription)
  fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'DB unavailable' }) })
})
afterEach(cleanup)

describe('browser push persistence', () => {
  it('clears confirmed state when a renewed endpoint cannot be persisted', async () => {
    getSubscription.mockResolvedValue(browserSubscription)
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    const { result } = renderHook(() => usePushSubscription('user-a'))
    await waitFor(() => expect(result.current.isSubscribed).toBe(true))
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'DB unavailable' }) })
    const listener = vi.mocked(navigator.serviceWorker.addEventListener).mock.calls[0][1] as (event: MessageEvent) => void
    await act(async () => { listener(new MessageEvent('message', { data: { type: 'PUSH_SUBSCRIPTION_CHANGED', ok: false } })) })
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.isSubscribed).toBe(false)
  })
  it('does not claim subscription success when the server rejects persistence and allows retry', async () => {
    const { result } = renderHook(() => usePushSubscription('user-a'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.subscribe() })
    expect(result.current.isSubscribed).toBe(false)
    expect(result.current.error).toBeTruthy()
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    await act(async () => { await result.current.subscribe() })
    expect(result.current.isSubscribed).toBe(true)
    expect(result.current.error).toBeNull()
  })
  it('synchronizes an existing browser subscription for each signed-in account', async () => {
    getSubscription.mockResolvedValue(browserSubscription)
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    const { result, rerender } = renderHook(({ userId }) => usePushSubscription(userId), { initialProps: { userId: 'user-a' } })
    await waitFor(() => expect(result.current.isSubscribed).toBe(true))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    rerender({ userId: 'user-b' })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.isSubscribed).toBe(true))
    rerender({ userId: '' })
    await waitFor(() => expect(result.current.isSubscribed).toBe(false))
  })
})


describe('notification activation prompt', () => {
  it('keeps the activation visible while persistence is pending', async () => {
    let resolveRequest: (response: unknown) => void = () => {}
    fetchMock.mockImplementation(() => new Promise(resolve => { resolveRequest = resolve }))
    render(createElement(PushNotificationPrompt, { userId: 'user-a', autoShowDelay: 0 }))
    fireEvent.click(await screen.findByRole('button', { name: 'Activar' }))
    expect(await screen.findByRole('button', { name: 'Guardando…' })).toBeTruthy()
    await act(async () => { resolveRequest({ ok: false, json: async () => ({ error: 'DB unavailable' }) }) })
    expect(await screen.findByRole('alert')).toBeTruthy()
  })
  it('stays hidden without a signed-in user', async () => {
    render(createElement(PushNotificationPrompt, { autoShowDelay: 0 }))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
    expect(screen.queryByRole('button', { name: 'Activar' })).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('stays hidden without a configured public VAPID key', async () => {
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', '')
    render(createElement(PushNotificationPrompt, { userId: 'user-a', autoShowDelay: 0 }))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
    expect(screen.queryByRole('button', { name: 'Activar' })).toBeNull()
  })
  it('shows persistence failures and keeps activation available for retry', async () => {
    render(createElement(PushNotificationPrompt, { userId: 'user-a', autoShowDelay: 0 }))
    fireEvent.click(await screen.findByRole('button', { name: 'Activar' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Activar' })).toBeTruthy()
    expect(localStorage.getItem('push-prompt-dismissed:user-a')).toBeNull()
  })
})
