import { createGroq } from '@ai-sdk/groq'
import { generateObject } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

const AnalysisSchema = z.object({
  errors: z.array(z.object({
    type: z.enum(['grammar', 'vocabulary', 'pronunciation', 'syntax']),
    pattern: z.string(),
    context: z.string(),
    user_attempt: z.string(),
    correct_form: z.string(),
  })),
  wins: z.array(z.string()),
  vocabulary_used: z.array(z.string()),
  vocabulary_struggling: z.array(z.string()),
  ai_notes: z.string(),
  updated_weaknesses: z.array(z.string()),
  updated_strengths: z.array(z.string()),
  week_summary: z.string(),
})

function inferMode(sessionId?: string): string {
  if (!sessionId) return 'conversation'
  if (sessionId.startsWith('writing-')) return 'writing'
  if (sessionId.startsWith('lesson-')) return 'lesson'
  if (sessionId.startsWith('verb')) return 'verb_drill'
  return 'conversation'
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { transcript, session_id: sessionLabel, mode: modeParam } = await request.json() as {
      transcript: Array<{ role: string; content: string }>
      session_id?: string
      mode?: string
    }

    if (!transcript || transcript.length < 2) {
      return new Response(JSON.stringify({ ok: false }), { status: 200 })
    }

    const mode = modeParam ?? inferMode(sessionLabel)

    // 1. Guardar conversación → obtener UUID real para usar como session_id
    const { data: convRow } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        mode,
        transcript_json: transcript,
      })
      .select('id')
      .single()

    const conversationId: string | null = convRow?.id ?? null

    // 2. Obtener perfil actual
    const { data: currentProfile } = await supabase
      .from('learner_profile')
      .select('profile_json')
      .eq('user_id', user.id)
      .single()

    const existingProfile = currentProfile?.profile_json as Record<string, unknown> ?? {}

    const transcriptText = transcript
      .map(m => `${m.role === 'user' ? 'STUDENT' : 'ALEX'}: ${m.content}`)
      .join('\n')

    // 3. Analizar con Groq
    const { object: analysis } = await generateObject({
      model: groq('llama-3.3-70b-versatile'),
      schema: AnalysisSchema,
      prompt: `You are an expert English language analyst. Analyze this tutoring session transcript and extract learning insights.

CURRENT STUDENT PROFILE:
- Weaknesses: ${JSON.stringify(existingProfile.weaknesses ?? [])}
- Strengths: ${JSON.stringify(existingProfile.strengths ?? [])}
- Error patterns: ${JSON.stringify(existingProfile.error_patterns ?? [])}

SESSION TRANSCRIPT:
${transcriptText}

Extract:
1. Grammar/vocabulary errors the student made (be specific about the pattern)
2. Things the student did well
3. English words/phrases the student used correctly
4. Words/phrases the student struggled with
5. Notes for the next tutoring session
6. Updated list of weaknesses (merge with existing, remove resolved ones)
7. Updated list of strengths
8. One-sentence summary for the student about this week's progress`,
    })

    // 4. Guardar error_log
    if (analysis.errors.length > 0) {
      await supabase.from('error_log').insert(
        analysis.errors.map(err => ({
          user_id: user.id,
          session_id: conversationId,
          error_type: err.type,
          pattern: err.pattern,
          context: err.context,
          user_attempt: err.user_attempt,
          correct_form: err.correct_form,
        }))
      )
    }

    // 5. Guardar session_analysis usando el UUID de conversations
    await supabase.from('session_analysis').insert({
      user_id: user.id,
      session_id: conversationId,
      errors_json: analysis.errors,
      wins_json: analysis.wins,
      vocabulary_used: analysis.vocabulary_used,
      ai_notes: analysis.ai_notes,
    })

    // 6. Actualizar learner_profile
    const sessionCount = ((existingProfile.session_count as number) ?? 0) + 1
    const updatedProfile = {
      ...existingProfile,
      strengths: analysis.updated_strengths,
      weaknesses: analysis.updated_weaknesses,
      vocabulary_struggling: [
        ...((existingProfile.vocabulary_struggling as string[]) ?? []),
        ...analysis.vocabulary_struggling,
      ].slice(-20),
      session_count: sessionCount,
      last_week_summary: analysis.week_summary,
      focus_areas: analysis.updated_weaknesses.slice(0, 3),
    }

    await supabase
      .from('learner_profile')
      .update({ profile_json: updatedProfile, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)

    // 7. XP por sesión completada
    await supabase.rpc('increment_xp', { user_id_param: user.id, xp_amount: 50 })
      .then(() => {})

    return new Response(JSON.stringify({ ok: true, analysis }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Session analysis error:', error)
    return new Response(JSON.stringify({ ok: false }), { status: 500 })
  }
}
