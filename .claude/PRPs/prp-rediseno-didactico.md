# PRP-001: Rediseño Didáctico de Secciones de Aprendizaje

> **Estado**: PENDIENTE
> **Fecha**: 2026-04-17
> **Proyecto**: Agente Inglés

---

## Objetivo

Rediseñar las secciones de aprendizaje (Lección, Desafío, y sus contenidos) para hacerlas más didácticas, visualmente atractivas e interactivas: mejorar la progresión pedagógica, añadir nuevos tipos de ejercicios, enriquecer el feedback y corregir limitaciones actuales en la experiencia de usuario.

## Por Qué

| Problema | Solución |
|----------|----------|
| Las lecciones tienen 4 tipos de ejercicio y feedback mínimo tras error | Añadir FillBlank y AudioRepeat, y feedback enriquecido con hints y "intento otra vez" |
| ConceptCard solo muestra info y el usuario sigue con un tap — cero interacción | Hacer que las tarjetas de concepto tengan mini-quiz de comprensión antes de avanzar |
| La pantalla de completado no muestra el desglose de respuestas ni errores | Pantalla de resultados con lista de respuestas correctas/incorrectas |
| El Modo Desafío tiene solo 7 ejercicios aleatorios sin progresión — se siente genérico | Añadir variantes de dificultad progresiva dentro del desafío |
| El contenido de ligas superiores (Plata–Gran Maestro) está en un solo nivel cada liga; no hay curva de dificultad interna | Cada liga tiene niveles graduales; actualmente los archivos existen pero el contenido no está completo para todas las ligas |
| SentenceBuilder no reubicula palabras — si las pones en orden incorrecto hay que sacarlas de a una | Permitir arrastrar tiles para reordenar dentro del área de respuesta |
| Sin indicador de qué tipo de ejercicio viene a continuación | Mini-mapa de pasos con iconos por tipo de ejercicio |

**Valor de negocio**: Mayor retención y completion rate → más XP ganado → mayor engagement diario → más probabilidad de conversión a plan de pago.

## Qué

### Criterios de Éxito
- [ ] Todas las lecciones de Bronce (L1–L11) muestran la barra de pasos con iconos al inicio
- [ ] ConceptCard incluye al menos 1 pregunta de comprensión flash antes de avanzar
- [ ] SentenceBuilder permite reordenar tiles ya colocados con un tap-para-mover
- [ ] La pantalla de completado muestra el resumen de respuestas (correcto/incorrecto por ejercicio)
- [ ] Existe al menos 1 ejercicio nuevo de tipo `fill_blank` en ≥ 3 lecciones de Bronce
- [ ] El Modo Desafío tiene 3 niveles de dificultad seleccionables (Fácil / Normal / Extremo)
- [ ] `npm run build` y `npm run typecheck` pasan sin errores

### Comportamiento Esperado (Happy Path)

1. Usuario entra a `/lesson` → ve la barra de pasos con iconos (💡 concepto, ❓ opción múltiple, 🔗 match, 🔨 constructor, ___ fill)
2. Llega a ConceptCard → lee la regla + ejemplos → responde un mini-quiz de 1 pregunta flash → recibe micro-feedback → avanza
3. Llega a SentenceBuilder → coloca tiles → si necesita cambiar el orden, toca un tile colocado y luego toca otro slot para intercambiarlos
4. Termina la lección → ve pantalla de resultados con lista de cada ejercicio marcado ✓/✗ y XP ganado
5. En Modo Desafío → selecciona dificultad antes de empezar → recibe 7 ejercicios del pool calibrado para esa dificultad

---

## Contexto

### Referencias
- `src/features/lessons/components/LessonClient.tsx` — Orquestador principal; controla índice, score y flujo
- `src/features/lessons/components/exercises/` — 4 componentes de ejercicio (ConceptCard, MultipleChoice, WordMatch, SentenceBuilder)
- `src/features/lessons/data/lesson-content.ts` — Tipos + loader async por liga/nivel
- `src/features/lessons/data/content-bronce.ts` — 11 lecciones (L1–L11), ~450 líneas, patrón de referencia
- `src/features/lessons/data/challenge-pool.ts` — Pool de ejercicios por liga; `buildChallengeContent` elige 7 aleatorios
- `src/shared/constants/leagues.ts` — 6 ligas con niveles (bronce:11, plata:10, oro:10, diamante:8, maestro:8, gran_maestro:6)
- `src/app/(main)/lesson/page.tsx` y `challenge/page.tsx` — Server components; pasan `serverLesson`, `league`, `mode`

### Arquitectura Propuesta (Feature-First)

```
src/features/lessons/
├── components/
│   ├── LessonClient.tsx          — MODIFICAR: step-map, completion summary
│   ├── StepMap.tsx               — NUEVO: barra de pasos con iconos
│   ├── CompletionSummary.tsx     — NUEVO: pantalla de resultados detallada
│   └── exercises/
│       ├── ConceptCard.tsx       — MODIFICAR: añadir mini-quiz interno
│       ├── MultipleChoice.tsx    — MODIFICAR: feedback enriquecido (intentos)
│       ├── SentenceBuilder.tsx   — MODIFICAR: reordenación por tap
│       ├── WordMatch.tsx         — sin cambios funcionales
│       └── FillBlank.tsx         — NUEVO: completar espacios en blanco
├── data/
│   ├── lesson-content.ts         — MODIFICAR: añadir tipo FillBlankExercise + difficulty a Challenge
│   ├── content-bronce.ts         — MODIFICAR: añadir ejercicios fill_blank en algunas lecciones
│   └── challenge-pool.ts         — MODIFICAR: segmentar pool por dificultad (easy/normal/hard)
└── hooks/
    └── useLives.ts               — sin cambios
```

### Modelo de Datos

No se requieren cambios de base de datos. Todo es cambio en tipos TypeScript + contenido + componentes UI.

**Nuevos tipos a agregar en `lesson-content.ts`**:
```typescript
export interface FillBlankExercise {
  type: 'fill_blank'
  sentence: string        // "She ___ working now" (usa ___ como marcador)
  options: string[]       // opciones del select
  correct: number
  explanation: string
}

export type ChallengeLevel = 'easy' | 'normal' | 'hard'
```

**Cambio en ConceptCard** — `ConceptExercise` se mantiene igual; el componente añade un `flashQuiz?: { question: string; options: string[]; correct: number }` opcional al tipo.

**LessonClient** — guardar historial de respuestas para la pantalla de completado:
```typescript
interface AnswerRecord {
  index: number
  type: Exercise['type']
  wasCorrect: boolean
}
```

---

## Blueprint (Assembly Line)

> Solo fases. Las subtareas se mapean al entrar a cada fase.

### Fase 1: Tipos + FillBlank
**Objetivo**: Extender el sistema de tipos con `FillBlankExercise` + `ChallengeLevel`, crear componente `FillBlank.tsx`, e integrarlo al flujo de `LessonClient`.
**Validación**: `npm run typecheck` pasa. Cargar una lección con ejercicio `fill_blank` no lanza error.

### Fase 2: ConceptCard con mini-quiz
**Objetivo**: Añadir campo opcional `flashQuiz` al tipo `ConceptExercise` y modificar `ConceptCard.tsx` para mostrar la pregunta flash antes de habilitar "Entendido →".
**Validación**: Al llegar a un ConceptCard con `flashQuiz`, el botón avanzar está bloqueado hasta responder. Sin `flashQuiz` el comportamiento es idéntico al actual.

### Fase 3: SentenceBuilder — reordenación por tap
**Objetivo**: Modificar `SentenceBuilder.tsx` para que al tocar un tile ya colocado se ponga en modo "seleccionado para mover" y el siguiente tap en otro slot vacío o en otro tile intercambie las posiciones.
**Validación**: El usuario puede reordenar tiles sin sacarlos al área de disponibles. Funcionalidad existente (sacar al pool) sigue funcionando.

### Fase 4: StepMap + historial de respuestas
**Objetivo**: Crear `StepMap.tsx` con iconos por tipo de ejercicio y barra de progreso visual. Modificar `LessonClient` para acumular `AnswerRecord[]` y pasar el historial a la pantalla de completado.
**Validación**: La barra de pasos aparece en la parte superior y el ícono del ejercicio actual se destaca. La pantalla de completado muestra la lista con ✓/✗.

### Fase 5: CompletionSummary
**Objetivo**: Crear `CompletionSummary.tsx` que reemplace la pantalla de completado inline en `LessonClient`. Debe mostrar: precisión, XP, lista de ejercicios con nombre/tipo y resultado, y botones de acción.
**Validación**: La pantalla de completado muestra el desglose y los CTA correctos para lección y desafío.

### Fase 6: Challenge difficulty levels
**Objetivo**: Modificar `challenge-pool.ts` para segmentar cada pool por nivel de dificultad. Modificar `LessonClient` y `ChallengePage` para mostrar el selector de dificultad antes de empezar el desafío.
**Validación**: Seleccionar "Fácil" en Desafío Bronce devuelve ejercicios más simples. Los 3 niveles producen sets distintos.

### Fase 7: Contenido — fill_blank en Bronce L1–L5
**Objetivo**: Añadir al menos 1 ejercicio `fill_blank` en las lecciones L1–L5 de `content-bronce.ts`, con `flashQuiz` en sus ConceptCards correspondientes.
**Validación**: Completar L1–L5 muestra los nuevos ejercicios sin errores de runtime.

### Fase 8: Validación Final
**Objetivo**: Sistema funcionando end-to-end en todos los modos.
**Validación**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] Pantalla de lección muestra StepMap
- [ ] ConceptCard con flashQuiz bloquea avance hasta responder
- [ ] SentenceBuilder permite reordenación
- [ ] Pantalla de completado muestra desglose
- [ ] Desafío ofrece selector de dificultad

---

## Aprendizajes (Self-Annealing)

> Se completa durante la implementación.

---

## Gotchas

- [ ] `SentenceBuilder` usa índices de `available[]` que pueden quedar `null` — el modo "mover tile" debe operar sobre `slots[]` directamente sin tocar el pool de disponibles
- [ ] `ConceptCard` con `flashQuiz` opcional: el campo debe ser `flashQuiz?: {...}` para no romper las 60+ lecciones existentes que no lo tienen
- [ ] `FillBlank` visualmente similar a `MultipleChoice` pero la semántica es diferente: la pregunta muestra un espacio en blanco en la oración, no una pregunta separada — diseñar el layout en consecuencia
- [ ] El selector de dificultad del Desafío debe aparecer ANTES de cargar el contenido (en el estado de carga inicial de `LessonClient`) — controlar con estado propio antes de `setContent`
- [ ] No romper la integración de `useLives` (solo aplica al modo `challenge`) al añadir el selector de dificultad
- [ ] Los archivos `content-*.ts` para Plata y superiores no tienen `flashQuiz` — está bien, es un campo opcional. Solo agregar a Bronce en Fase 7.

## Anti-Patrones

- NO reescribir `LessonClient.tsx` completo — editarlo quirúrgicamente por sección
- NO añadir dependencias externas para drag-and-drop — usar tap-to-move con estado React puro (YAGNI)
- NO ignorar errores de TypeScript — el `type` discriminante en `Exercise` debe incluir `'fill_blank'`
- NO hardcodear strings de dificultad — usar el tipo `ChallengeLevel`
- NO omitir `key` correctas en listas de tiles (usar índice compuesto o id único)

---

*PRP pendiente aprobación. No se ha modificado código.*
