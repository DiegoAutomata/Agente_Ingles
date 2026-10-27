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

    const { transcript, session_id: sessionLabel, mode: modeParam } = z.object({
      transcript: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(6000) })).min(2).max(80),
      session_id: z.string().min(1).max(100),
      mode: z.enum(['conversation', 'writing', 'lesson', 'verb_drill', 'vocabulary']).optional(),
    }).parse(await request.json())
    if (transcript.reduce((n, m) => n + m.content.length, 0) > 40000) return Response.json({ok: false}, {status: 400})
    if (!process.env.GROQ_API_KEY) return Response.json({ok: false, error: 'Tutor no configurado.'}, {status: 503})
    const mode = modeParam ?? inferMode(sessionLabel)

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
1. Grammar/vocabulary errors the student actually made (be specific about the pattern). Never infer pronunciation problems from text; there is no audio available. Only quote real user attempts, never invent mistakes.
2. Things the student did well
3. English words/phrases the student used correctly
4. Words/phrases the student struggled with
5. Notes for the next tutoring session
6. Updated list of weaknesses (merge with existing, remove resolved ones)
7. Updated list of strengths
8. One-sentence summary for the student about this week's progress`,
    })

    const { error: saveError } = await supabase.rpc('save_session_analysis', {
      session_label: sessionLabel, session_mode: mode, transcript, analysis,
    })
    if (saveError) throw saveError

    return new Response(JSON.stringify({ ok: true, analysis }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return Response.json({ok: false, error: 'Sesión inválida.'}, {status: 400})
    console.error('Session analysis error:', error)
    return new Response(JSON.stringify({ ok: false }), { status: 500 })
  }
}
