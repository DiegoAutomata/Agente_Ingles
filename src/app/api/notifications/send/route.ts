import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { z } from 'zod'
import { configureWebPush, getAdminClient, isExpiredSubscription } from '../_shared'

const localPath = z.string().max(2048).refine(value => value.startsWith('/') && !value.startsWith('//') && !value.includes('\\'), 'Expected a local path')
const SendSchema = z.object({
  userId: z.uuid(),
  notification: z.object({
    title: z.string().trim().min(1).max(160),
    body: z.string().max(1000).optional(),
    icon: localPath.optional(),
    data: z.object({ url: localPath.optional() }).optional(),
  }),
})

export async function POST(request: Request) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!secret) return NextResponse.json({ error: 'Notifications not configured' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { userId, notification } = SendSchema.parse(await request.json())
    const admin = getAdminClient()
    if (!admin || !configureWebPush()) return NextResponse.json({ error: 'Notifications not configured' }, { status: 503 })

    const { data: subscriptions, error } = await admin.from('push_subscriptions')
      .select('id, endpoint, p256dh, auth').eq('user_id', userId)
    if (error) throw new Error('Subscription lookup failed')

    let sent = 0
    let failed = 0
    for (const sub of subscriptions ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(notification),
        )
      } catch (deliveryError) {
        if (isExpiredSubscription(deliveryError)) {
          const { error: deleteError } = await admin.from('push_subscriptions').delete().eq('id', sub.id)
          if (deleteError) throw new Error('Expired subscription removal failed')
        }
        failed++
        continue
      }
      const { error: updateError } = await admin.from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() }).eq('id', sub.id)
      if (updateError) throw new Error('Subscription timestamp update failed')
      sent++
    }
    return NextResponse.json({ success: true, sent, failed })
  } catch (error) {
    const invalid = error instanceof z.ZodError || error instanceof SyntaxError
    return NextResponse.json({ error: invalid ? 'Invalid notification' : 'Could not send notifications' }, { status: invalid ? 400 : 500 })
  }
}
