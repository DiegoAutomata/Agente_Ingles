import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    let xp_amount = 100
    try {
      const body = await request.json() as { xp_amount?: number }
      if (typeof body.xp_amount === 'number' && body.xp_amount > 0) {
        xp_amount = body.xp_amount
      }
    } catch { /* body parse failed, use default */ }

    const { data, error } = await supabase.rpc('advance_lesson', {
      user_id_param: user.id,
    })

    if (error) throw error

    await supabase.rpc('increment_xp', { user_id_param: user.id, xp_amount })
      .then(() => {})

    return new Response(JSON.stringify({ ok: true, result: data }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('complete-lesson error:', error)
    return new Response(JSON.stringify({ ok: false }), { status: 500 })
  }
}
