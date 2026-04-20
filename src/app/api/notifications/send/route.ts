import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function initWebpush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:noreply@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    initWebpush()
    const supabaseAdmin = getSupabaseAdmin()

    const { userId, notification } = await request.json() as {
      userId: string
      notification: { title: string; body?: string; icon?: string; data?: Record<string, unknown> }
    }

    const { data: subscriptions } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (!subscriptions?.length) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    let sent = 0
    let failed = 0

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(notification)
        )
        await supabaseAdmin
          .from('push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', sub.id)
        sent++
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        // 4xx = suscripción inválida → eliminar (excepto 429 rate limit)
        // Apple falla silenciosamente (sin statusCode) → también eliminar
        if (!status || (status >= 400 && status < 500 && status !== 429)) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
        }
        failed++
      }
    }

    return NextResponse.json({ success: true, sent, failed })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
