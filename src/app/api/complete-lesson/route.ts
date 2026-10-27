import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { LEAGUES } from '@/shared/constants/leagues'

const Completion = z.object({
  mode: z.enum(['lesson', 'challenge']),
  league: z.string().refine(id => LEAGUES.some(l => l.id === id)),
  lesson: z.number().int().min(1).max(11),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ ok: false, error: 'Inicia sesión para guardar.' }, { status: 401 })

    const body = Completion.parse(await request.json())
    const { data, error } = await supabase.rpc('complete_activity', {
      activity_mode: body.mode, expected_league: body.league, expected_lesson: body.lesson,
    })

    if (error) {
      if (error.message.includes('progress_conflict')) return Response.json({ ok: false, error: 'Tu progreso cambió en otra sesión. Vuelve al inicio y recarga.' }, { status: 409 })
      throw error
    }

    return new Response(JSON.stringify({ ok: true, result: data }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return Response.json({ ok: false, error: 'Lección inválida.' }, { status: 400 })
    console.error('complete-lesson error:', error)
    return new Response(JSON.stringify({ ok: false }), { status: 500 })
  }
}
