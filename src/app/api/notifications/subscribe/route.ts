import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { endpointSchema, getAdminClient, subscriptionSchema } from '../_shared'

const SubscribeSchema = z.object({
  subscription: subscriptionSchema,
  deviceInfo: z.object({
    platform: z.string().max(200).optional(),
    language: z.string().max(50).optional(),
  }).optional(),
  oldEndpoint: endpointSchema.optional(),
})
const DeleteSchema = z.object({ endpoint: endpointSchema })

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { subscription, deviceInfo, oldEndpoint } = SubscribeSchema.parse(await request.json())
    const admin = getAdminClient()
    if (!admin) return NextResponse.json({ error: 'Notifications not configured' }, { status: 503 })

    // A browser endpoint belongs to its current signed-in account. Reassign atomically
    // through the server; do not expose or query another account's subscription.
    const { data, error } = await admin.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: deviceInfo?.platform ?? '',
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' }).select('id').single()
    if (error || !data) throw new Error('Subscription persistence failed')

    if (oldEndpoint && oldEndpoint !== subscription.endpoint) {
      const { error: deleteError } = await admin.from('push_subscriptions')
        .delete().eq('endpoint', oldEndpoint).eq('user_id', user.id)
      if (deleteError) throw new Error('Previous subscription removal failed')
    }
    return NextResponse.json({ success: true, subscription_id: data.id })
  } catch (error) {
    const invalid = error instanceof z.ZodError || error instanceof SyntaxError
    return NextResponse.json({ error: invalid ? 'Invalid subscription' : 'Could not save subscription' }, { status: invalid ? 400 : 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { endpoint } = DeleteSchema.parse(await request.json())
    const admin = getAdminClient()
    if (!admin) return NextResponse.json({ error: 'Notifications not configured' }, { status: 503 })

    const { error } = await admin.from('push_subscriptions')
      .delete().eq('endpoint', endpoint).eq('user_id', user.id)
    if (error) throw new Error('Subscription removal failed')
    return NextResponse.json({ success: true })
  } catch (error) {
    const invalid = error instanceof z.ZodError || error instanceof SyntaxError
    return NextResponse.json({ error: invalid ? 'Invalid subscription' : 'Could not remove subscription' }, { status: invalid ? 400 : 500 })
  }
}
