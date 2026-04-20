import { createGroq } from '@ai-sdk/groq'
import { generateObject } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

const CorrectionSchema = z.object({
  overallScore: z.number().min(1).max(10),
  summary: z.string(),
  errors: z.array(
    z.object({
      wrong: z.string(),
      correct: z.string(),
      rule: z.string(),
      type: z.enum(['grammar', 'vocabulary', 'spelling', 'style', 'punctuation']),
    }),
  ),
  correctedText: z.string(),
  strengths: z.array(z.string()),
  tips: z.array(z.string()),
})

export type WritingFeedback = z.infer<typeof CorrectionSchema>

export async function POST(req: Request) {
  try {
    const { text, prompt: writingPrompt } = (await req.json()) as { text: string; prompt?: string }

    if (!text?.trim()) {
      return new Response('Text required', { status: 400 })
    }

    const { object } = await generateObject({
      model: groq('llama-3.3-70b-versatile'),
      schema: CorrectionSchema,
      prompt: `You are an expert English teacher. Analyze this English text written by a Spanish-speaking learner and return structured corrections.

TEXT TO ANALYZE:
"""
${text.trim()}
"""

Instructions:
- overallScore: 1-10 (1=many errors, 10=perfect)
- summary: 1-2 sentences about the overall quality in Spanish
- errors: list every grammar/vocabulary/spelling/style error. For each:
  - wrong: the exact wrong phrase or word from the text
  - correct: the correct version
  - rule: brief grammar rule explanation in Spanish (1-2 sentences)
  - type: one of grammar, vocabulary, spelling, style, punctuation
- correctedText: the full text corrected (preserving the writer's intent)
- strengths: 1-3 things done well (in Spanish)
- tips: 1-3 actionable tips to improve (in Spanish)

If the text has no errors, return an empty errors array and a high score.`,
    })

    // Guardar en writing_submissions (fire-and-forget, no bloquea la respuesta)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      supabase.from('writing_submissions').insert({
        user_id: user.id,
        prompt: writingPrompt ?? null,
        user_text: text.trim(),
        ai_feedback: object.summary,
        corrected_text: object.correctedText,
        score: object.overallScore,
      }).then(() => {})
    }

    return new Response(JSON.stringify(object), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('writing-coach error:', error)
    return new Response(JSON.stringify({ error: 'Error al analizar el texto' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
