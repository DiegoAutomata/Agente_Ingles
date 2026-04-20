import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

function getSupabaseAdmin() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { subscription, deviceInfo, oldEndpoint } = await request.json() as {
      subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
      deviceInfo?: { platform?: string; language?: string }
      oldEndpoint?: string
    }

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    if (oldEndpoint) {
      await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', oldEndpoint).eq('user_id', user.id)
    }

    const { data: existing } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', subscription.endpoint)
      .single()

    if (existing) {
      await supabaseAdmin
        .from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', existing.id)
      return NextResponse.json({ success: true, subscription_id: existing.id })
    }

    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .insert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: deviceInfo?.platform ?? '',
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, subscription_id: data.id })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { endpoint } = await request.json() as { endpoint: string }
    const supabaseAdmin = getSupabaseAdmin()
    await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
