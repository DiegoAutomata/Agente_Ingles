import { createClient } from '@/lib/supabase/server'

function sm2(interval: number, repetitions: number, easeFactor: number, quality: number) {
  // quality: 0=Again, 1=Hard, 2=Good, 3=Easy → mapped to SM-2 q: 0, 2, 4, 5
  const q = [0, 2, 4, 5][quality] ?? 4

  let newInterval: number
  let newRepetitions: number
  let newEaseFactor: number

  if (q < 3) {
    newInterval = 1
    newRepetitions = 0
    newEaseFactor = easeFactor
  } else {
    if (repetitions === 0) newInterval = 1
    else if (repetitions === 1) newInterval = 6
    else newInterval = Math.round(interval * easeFactor)

    newEaseFactor = Math.max(
      1.3,
      easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02),
    )
    newRepetitions = repetitions + 1
  }

  const nextReviewAt = new Date(Date.now() + newInterval * 86_400_000).toISOString()

  return { newInterval, newRepetitions, newEaseFactor, nextReviewAt }
}

export async function POST(req: Request) {
  try {
    const { wordId, quality } = (await req.json()) as { wordId: number; quality: number }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data: existing } = await supabase
      .from('user_vocabulary')
      .select('srs_interval, srs_repetitions, srs_ease_factor')
      .eq('user_id', user.id)
      .eq('word_id', wordId)
      .single()

    const interval     = existing?.srs_interval    ?? 1
    const repetitions  = existing?.srs_repetitions ?? 0
    const easeFactor   = existing?.srs_ease_factor ?? 2.5

    const { newInterval, newRepetitions, newEaseFactor, nextReviewAt } = sm2(
      interval, repetitions, easeFactor, quality,
    )

    await supabase.from('user_vocabulary').upsert({
      user_id:         user.id,
      word_id:         wordId,
      srs_interval:    newInterval,
      srs_repetitions: newRepetitions,
      srs_ease_factor: newEaseFactor,
      next_review_at:  nextReviewAt,
      last_reviewed_at: new Date().toISOString(),
      mastered:        newRepetitions >= 4 && newInterval >= 21,
    })

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('srs-review error:', error)
    return new Response(JSON.stringify({ ok: false }), { status: 500 })
  }
}
