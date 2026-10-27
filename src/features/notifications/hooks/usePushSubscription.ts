'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UsePushSubscriptionReturn {
  isSupported: boolean
  permission: NotificationPermission | 'unsupported'
  isSubscribed: boolean
  loading: boolean
  error: string | null
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<boolean>
}

async function persistSubscription(subscription: PushSubscription) {
  const response = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      deviceInfo: { platform: navigator.platform, language: navigator.language },
    }),
  })
  if (!response.ok || !(await response.json()).success) {
    throw new Error('No se pudieron guardar los recordatorios. Intentá de nuevo.')
  }
}

export function usePushSubscription(userId?: string): UsePushSubscriptionReturn {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentAccount = useRef(userId)
  useEffect(() => { currentAccount.current = userId }, [userId])
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  useEffect(() => {
    let cancelled = false
    const supported = typeof window !== 'undefined' && 'Notification' in window &&
      'serviceWorker' in navigator && 'PushManager' in window
    setIsSupported(supported)
    setPermission(supported ? Notification.permission : 'unsupported')
    setIsSubscribed(false)
    setError(null)
    setLoading(true)

    if (!supported || !userId || !vapidKey) {
      setLoading(false)
      return
    }

    async function synchronize() {
      if (cancelled) return
      setLoading(true)
      setError(null)
      setIsSubscribed(false)
      try {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (cancelled || currentAccount.current !== userId) return
        if (subscription) {
          // The same browser can be used by several accounts. The server binds
          // its endpoint to the current authenticated user on every account change.
          await persistSubscription(subscription)
          if (!cancelled && currentAccount.current === userId) setIsSubscribed(true)
        }
      } catch {
        if (!cancelled) setError('No se pudieron guardar los recordatorios. Intentá de nuevo.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    const onSubscriptionChange = (event: MessageEvent) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') void synchronize()
    }
    navigator.serviceWorker.addEventListener('message', onSubscriptionChange)
    void synchronize()
    return () => {
      cancelled = true
      navigator.serviceWorker.removeEventListener('message', onSubscriptionChange)
    }
  }, [userId, vapidKey])

  const subscribe = useCallback(async () => {
    if (!isSupported || !userId || !vapidKey) return false
    setLoading(true)
    setError(null)
    setIsSubscribed(false)
    try {
      const granted = await Notification.requestPermission()
      if (currentAccount.current !== userId) return false
      setPermission(granted)
      if (granted !== 'granted') {
        setError('Permití las notificaciones en tu navegador para activar recordatorios.')
        return false
      }
      const registration = await navigator.serviceWorker.ready
      if (currentAccount.current !== userId) return false
      const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4)
      const rawData = atob((vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/'))
      const applicationServerKey = Uint8Array.from(rawData, char => char.charCodeAt(0))
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey,
      })
      if (currentAccount.current !== userId) return false
      await persistSubscription(subscription)
      if (currentAccount.current !== userId) return false
      setIsSubscribed(true)
      return true
    } catch {
      if (currentAccount.current === userId) setError('No se pudieron guardar los recordatorios. Intentá de nuevo.')
      return false
    } finally {
      if (currentAccount.current === userId) setLoading(false)
    }
  }, [isSupported, userId, vapidKey])

  const unsubscribe = useCallback(async () => {
    if (!userId || !isSupported) return false
    setLoading(true)
    setError(null)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (currentAccount.current !== userId) return false
      if (subscription) {
        const response = await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        if (!response.ok || !(await response.json()).success) throw new Error('Subscription removal failed')
        if (currentAccount.current !== userId) return false
        if (!(await subscription.unsubscribe())) throw new Error('Browser subscription removal failed')
      }
      setIsSubscribed(false)
      return true
    } catch {
      if (currentAccount.current === userId) setError('No se pudieron desactivar los recordatorios. Intentá de nuevo.')
      return false
    } finally {
      if (currentAccount.current === userId) setLoading(false)
    }
  }, [userId, isSupported])

  return { isSupported, permission, isSubscribed, loading, error, subscribe, unsubscribe }
}
