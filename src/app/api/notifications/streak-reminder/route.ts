import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { configureWebPush, getAdminClient, isExpiredSubscription } from '../_shared'

// Vercel cron uses CRON_SECRET. A service-role token also supports manual runs
// when no dedicated cron secret is configured.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!secret) return NextResponse.json({ error: 'Notifications not configured' }, { status: 503 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = getAdminClient()
    if (!admin || !configureWebPush()) return NextResponse.json({ error: 'Notifications not configured' }, { status: 503 })
    const { data: usersAtRisk, error: usersError } = await admin.from('user_profiles')
      .select('id, streak').lt('last_session_at', new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()).gt('streak', 0)
    if (usersError) throw new Error('Reminder recipient lookup failed')
    if (!usersAtRisk?.length) return NextResponse.json({ ok: true, notified: 0 })

    const { data: subscriptions, error: subscriptionsError } = await admin.from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth').in('user_id', usersAtRisk.map(user => user.id))
    if (subscriptionsError) throw new Error('Subscription lookup failed')

    const streakMap = new Map(usersAtRisk.map(user => [user.id, user.streak]))
    let sent = 0
    const invalidIds: string[] = []
    for (const sub of subscriptions ?? []) {
      const streak = streakMap.get(sub.user_id) ?? 0
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: streak >= 7 ? `🔥 ${streak} días seguidos — ¡no rompas la racha!` : '📚 Alex te espera hoy',
            body: streak >= 3
              ? `Llevas ${streak} días de racha. Haz aunque sea una lección para mantenerla.`
              : 'Practica unos minutos de inglés hoy. Cada día cuenta.',
            icon: '/icons/icon-192.png',
            data: { url: '/dashboard' },
          }),
        )
        sent++
      } catch (deliveryError) {
        // Network failures and rate limits are retryable, not expired endpoints.
        if (isExpiredSubscription(deliveryError)) invalidIds.push(sub.id)
      }
    }

    if (invalidIds.length) {
      const { error: cleanupError } = await admin.from('push_subscriptions').delete().in('id', invalidIds)
      if (cleanupError) throw new Error('Expired subscription removal failed')
    }
    return NextResponse.json({ ok: true, notified: sent, cleaned: invalidIds.length })
  } catch {
    return NextResponse.json({ error: 'Could not run reminders' }, { status: 500 })
  }
}

export const POST = GET
