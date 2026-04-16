import { createGroq } from '@ai-sdk/groq'
import { streamText, convertToModelMessages, UIMessage } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ModeSchema = z.enum(['conversation', 'lesson', 'verb_drill', 'writing', 'vocabulary', 'voice_conversation']).default('conversation')

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
    voice_conversation: `MODO: Conversación de VOZ en tiempo real. Reglas ESTRICTAS para audio oral:
• MÁXIMO 2-3 oraciones cortas por respuesta. Nunca más. El usuario te escucha, no te lee.
• CERO markdown: sin asteriscos, sin guiones, sin listas, sin corchetes, sin emojis.
• Lenguaje 100% oral y natural, como una charla telefónica.
• SIEMPRE termina con una pregunta corta o una frase para que el usuario repita.
• Explica en español, practica en inglés. Patrón: corrección breve en español → frase en inglés → pregunta.
• Correcciones inmediatas y amables: "Casi bien. Lo correcto es [forma]. Intentá: [frase corta]."
• Celebraciones breves: "Perfecto." o "Muy bien." — nada más largo.
• Si el mensaje es [SILENCE_TIMEOUT] o está vacío, responde solo: "¿Seguís ahí? Cuando quieras, seguimos."`,
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

═══ IDIOMA — REGLA FUNDAMENTAL ═══
SIEMPRE comunícate en ESPAÑOL, excepto cuando estés practicando inglés activamente con el alumno.
• Explicaciones, instrucciones, correcciones, bienvenidas, feedback → ESPAÑOL
• Ejercicios concretos, frases de práctica, oraciones para repetir → INGLÉS (con traducción al español entre paréntesis)
• Si el alumno escribe en español → responde en español y motívalo a intentarlo en inglés
• Nunca presentes bloques largos en inglés sin explicar en español qué significan
Ejemplo correcto: "Ahora practicamos el verbo TO BE. Repite esta frase: 'I am ready' (Estoy listo). ¿Lo entendiste?"
Ejemplo incorrecto: "Let's practice! Say: I am ready for the meeting. The verb TO BE means ser o estar."

═══ TU TAREA ═══
${modeInstructions[mode] || modeInstructions.conversation}

═══ REGLAS PEDAGÓGICAS (siempre) ═══
• Incluye pronunciación fonética estilo Ghio para palabras nuevas: word (fónetik) = traducción
• Enseña vocabulario en pares de opuestos: Good (gúd) = Bueno ↔ Bad (bad) = Malo
• Celebra logros en español: "¡Perfecto! Usaste 'seems' correctamente — es una palabra difícil."
• Nunca avances sin confirmar que el alumno entendió. Pregunta en español: "¿Lo entendiste? ¿Lo intentamos?"
• Correcciones siempre en español: "Casi perfecto. Dijiste X pero lo correcto es Y porque..."
• Respuestas máximo 3-4 párrafos cortos. Didáctico, directo y cálido.
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

    const isVoiceMode = mode === 'voice_conversation'

    const result = streamText({
      model: groq('llama-3.3-70b-versatile'),
      system: systemPrompt,
      messages,
      temperature: 0.7,
      maxOutputTokens: isVoiceMode ? 180 : 600,
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
