import { createGroq } from '@ai-sdk/groq'
import { streamText, convertToModelMessages, UIMessage } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ModeSchema = z.enum(['conversation', 'lesson', 'verb_drill', 'writing', 'vocabulary']).default('conversation')

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

function buildSystemPrompt(
  mode: string,
  profile: Record<string, unknown> | null,
  userProfile: { ghio_lesson: number; module: number; xp: number; streak: number } | null
): string {
  const lesson = userProfile?.ghio_lesson ?? 1
  const module = userProfile?.module ?? 1
  const xp = userProfile?.xp ?? 0
  const streak = userProfile?.streak ?? 0

  const strengths = (profile?.strengths as string[])?.join(', ') || 'aún evaluando'
  const weaknesses = (profile?.weaknesses as string[])?.join(', ') || 'aún evaluando'
  const errorPatterns = (profile?.error_patterns as Array<{ pattern: string; frequency: number }>)
    ?.map(e => `"${e.pattern}" (${e.frequency}x)`)
    ?.join(', ') || 'ninguno registrado aún'
  const lastWeekSummary = (profile?.last_week_summary as string) || 'Primera sesión'

  const modeInstructions: Record<string, string> = {
    conversation: `MODO: Conversación libre. Habla naturalmente en inglés. Corrige errores de forma sutil e integrada en la conversación — nunca interrumpas el flujo. Adapta el vocabulario al nivel del alumno (Lección Ghio ${lesson}/11). Si el alumno comete un error frecuente de su perfil, corrígelo inmediatamente después de entender su mensaje.`,
    lesson: `MODO: Lección estructurada. Estás enseñando la Lección ${lesson} del método Ghio. Sigue la secuencia: vocabulario nuevo (con pronunciación fonética) → explicación con ejemplos → ejercicios prácticos → mini-examen. Siempre muestra la pronunciación entre paréntesis.`,
    verb_drill: `MODO: Drill de los 16 verbos básicos de Ghio. Practica los verbos en todos los tiempos (presente, futuro con WILL, gerundio, pasado). Presenta ejercicios de conjugación y traducción. Sé rápido y dinámico.`,
    writing: `MODO: Writing Coach. El alumno te enviará un texto en inglés. Analízalo línea por línea: (1) identifica errores de gramática, vocabulario y estilo, (2) explica cada error con la forma correcta, (3) proporciona la versión corregida completa.`,
    vocabulary: `MODO: Vocabulario SRS. Practica el vocabulario del método Ghio. Presenta flashcards, pronunciación fonética, ejemplos y palabras opuestas (Good ↔ Bad). Adapta la dificultad al nivel.`,
  }

  return `Eres Alex, el mejor tutor de inglés privado del mundo para este alumno específico.
Tu método base: Augusto Ghio "Inglés Básico" — 850 palabras + 16 verbos básicos.

═══ PERFIL DE TU ALUMNO ═══
• Nivel: Lección Ghio ${lesson}/11 — Módulo ${module}/3
• XP acumulado: ${xp} puntos
• Racha: ${streak} días consecutivos
• Fortalezas: ${strengths}
• Debilidades: ${weaknesses}
• Patrones de error frecuentes: ${errorPatterns}
• Resumen última semana: ${lastWeekSummary}

═══ TU TAREA ═══
${modeInstructions[mode] || modeInstructions.conversation}

═══ REGLAS PEDAGÓGICAS (siempre) ═══
• Incluye pronunciación fonética estilo Ghio para palabras nuevas: word (fónetik) = traducción
• Presenta frases en múltiples contextos cuando enseñes algo nuevo
• Enseña vocabulario en pares de opuestos: Good (gúd) = Bueno ↔ Bad (bad) = Malo
• Celebra pequeños logros: "Perfect! You used 'seems' correctly — that's a tricky one."
• Nunca avances a algo nuevo sin confirmar que el alumno entendió lo anterior
• Si el alumno escribe en español, responde en inglés con traducción entre corchetes
• Respuestas máximo de 3-4 párrafos cortos. Sé didáctico, directo y cálido.
• Objetivo final: Inglés profesional B2 para trabajo, entrevistas, reuniones y emails`
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { messages?: UIMessage[]; mode?: string }
    const mode = ModeSchema.parse(body.mode ?? 'conversation')
    const uiMessages = body.messages ?? []

    // Convert UIMessage[] (v6 format with parts) to CoreMessage[] for the model
    const messages = await convertToModelMessages(uiMessages)

    // Obtener perfil del usuario (sin bloquear si falla)
    let userProfile = null
    let learnerProfile = null

    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const [profileRes, learnerRes] = await Promise.all([
          supabase.from('user_profiles').select('ghio_lesson, module, xp, streak').eq('id', user.id).single(),
          supabase.from('learner_profile').select('profile_json').eq('user_id', user.id).single(),
        ])
        userProfile = profileRes.data
        learnerProfile = learnerRes.data?.profile_json
      }
    } catch {
      // Continúa sin perfil si hay error de auth
    }

    const systemPrompt = buildSystemPrompt(mode, learnerProfile, userProfile)

    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: systemPrompt,
      messages,
      temperature: 0.7,
      maxOutputTokens: 600,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 })
    }
    console.error('Tutor API error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  }
}
