import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data, error } = await supabase.rpc('advance_lesson', {
      user_id_param: user.id,
    })

    if (error) throw error

    // XP por completar lección
    await supabase.rpc('increment_xp', { user_id_param: user.id, xp_amount: 100 })
      .then(() => {})

    return new Response(JSON.stringify({ ok: true, result: data }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('complete-lesson error:', error)
    return new Response(JSON.stringify({ ok: false }), { status: 500 })
  }
}
