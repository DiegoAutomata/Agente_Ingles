import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const reviewInput = z.object({
  wordId: z.number().int().positive().max(2_147_483_647),
  quality: z.number().int().min(0).max(3),
}).strict()

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ ok: false, error: 'Iniciá sesión para guardar el repaso.' }, { status: 401 })
    }

    let payload: unknown
    try {
      payload = await req.json()
    } catch {
      return Response.json({ ok: false, error: 'El cuerpo debe ser JSON válido.' }, { status: 400 })
    }
    const input = reviewInput.safeParse(payload)
    if (!input.success) {
      return Response.json({ ok: false, error: 'La palabra y la valoración no son válidas.' }, { status: 400 })
    }
    const { wordId, quality } = input.data

    const { data: saved, error: saveError } = await supabase.rpc('review_vocabulary', {
      word_id_param: wordId,
      quality_param: quality,
    })

    if (saveError?.code === '23503') {
      return Response.json({ ok: false, error: 'La palabra ya no está disponible. Actualizá el mazo.' }, { status: 404 })
    }
    if (saveError) throw saveError
    if (!saved) throw new Error('SRS save returned no progress')

    return Response.json({
      ok: true,
      review: {
        wordId: saved.word_id,
        interval: saved.srs_interval,
        repetitions: saved.srs_repetitions,
        easeFactor: saved.srs_ease_factor,
        nextReviewAt: saved.next_review_at,
        mastered: saved.mastered,
      },
    })
  } catch (error) {
    console.error('srs-review error:', error)
    return Response.json({ ok: false, error: 'No se pudo guardar el repaso. Reintentá.' }, { status: 500 })
  }
}
