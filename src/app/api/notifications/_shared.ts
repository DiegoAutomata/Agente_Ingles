import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { z } from 'zod'

const pushHosts = ['fcm.googleapis.com', 'android.googleapis.com', 'web.push.apple.com']
export const endpointSchema = z.string().url().max(4096).refine(value => {
  const url = new URL(value)
  return url.protocol === 'https:' && !url.username && !url.password &&
    (pushHosts.includes(url.hostname) || url.hostname.endsWith('.push.services.mozilla.com') ||
      url.hostname.endsWith('.notify.windows.com'))
}, 'Unsupported push endpoint')

export const subscriptionSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({
    p256dh: z.string().min(16).max(256).regex(/^[A-Za-z0-9_-]+={0,2}$/),
    auth: z.string().min(16).max(256).regex(/^[A-Za-z0-9_-]+={0,2}$/),
  }),
})

export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim()
  if (!publicKey || !privateKey) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:noreply@example.com', publicKey, privateKey)
  return true
}

export function isExpiredSubscription(error: unknown) {
  const status = (error as { statusCode?: number } | null)?.statusCode
  return status === 404 || status === 410
}
