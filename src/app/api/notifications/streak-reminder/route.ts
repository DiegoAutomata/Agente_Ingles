import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

// Este endpoint es llamado por el cron de Vercel (vercel.json) a las 18:00 UTC todos los días.
// También acepta POST con Bearer token para llamadas manuales.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:noreply@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function GET(request: Request) {
  // Vercel cron llama con un header especial — validamos con el service role key
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return runReminder()
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return runReminder()
}

async function runReminder() {
  try {
    // Usuarios que llevan más de 20h sin sesión Y tienen suscripciones push activas
    const { data: usersAtRisk } = await supabaseAdmin
      .from('user_profiles')
      .select('id, streak')
      .lt('last_session_at', new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString())
      .gt('streak', 0)

    if (!usersAtRisk?.length) {
      return NextResponse.json({ ok: true, notified: 0 })
    }

    const userIds = usersAtRisk.map(u => u.id)

    const { data: subscriptions } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    if (!subscriptions?.length) {
      return NextResponse.json({ ok: true, notified: 0 })
    }

    const streakMap = Object.fromEntries(usersAtRisk.map(u => [u.id, u.streak]))

    let sent = 0
    const invalidIds: string[] = []

    for (const sub of subscriptions) {
      const streak = streakMap[sub.user_id] ?? 0
      const notification = {
        title: streak >= 7 ? `🔥 ${streak} días seguidos — ¡no rompas la racha!` : '📚 Alex te espera hoy',
        body: streak >= 3
          ? `Llevas ${streak} días de racha. Haz aunque sea una lección para mantenerla.`
          : 'Practica unos minutos de inglés hoy. Cada día cuenta.',
        icon: '/icons/icon-192x192.png',
        data: { url: '/dashboard' },
      }

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(notification)
        )
        sent++
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode
        if (!status || (status >= 400 && status < 500 && status !== 429)) {
          invalidIds.push(sub.id)
        }
      }
    }

    // Limpiar suscripciones inválidas
    if (invalidIds.length) {
      await supabaseAdmin.from('push_subscriptions').delete().in('id', invalidIds)
    }

    return NextResponse.json({ ok: true, notified: sent, cleaned: invalidIds.length })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
