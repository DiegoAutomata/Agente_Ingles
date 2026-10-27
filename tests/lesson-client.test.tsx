// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
const load = vi.hoisted(() => vi.fn(async () => ({ lessonNumber: 1, title: 'Práctica', subtitle: '', colorFrom: '', colorTo: '', xpReward: 500, exercises: [{ type: 'multiple_choice', question: 'Test?', options: ['yes','no'], correct: 0 }] })))
vi.mock('@/features/lessons/data/lesson-content', () => ({ getLessonContentAsync: load, buildChallengeContent: () => [] }))
vi.mock('@/features/lessons/components/exercises/MultipleChoice', () => ({ default: ({ onDone }: {onDone: (correct: boolean) => void}) => <button onClick={() => onDone(true)}>Responder</button> }))
import LessonClient from '@/features/lessons/components/LessonClient'
afterEach(() => { cleanup(); localStorage.clear(); vi.unstubAllGlobals(); load.mockClear() })
it('uses server progress instead of another account cached progress', async () => {
  localStorage.setItem('alex-progress', JSON.stringify({ league: 'gran_maestro', lesson: 6 }))
  render(<LessonClient serverLesson={1} league="plata" mode="lesson" />)
  await screen.findByText('Responder')
  expect(load).toHaveBeenCalledWith('plata', 1)
})
it('does not celebrate or lose the last answer when saving fails', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 500 })); vi.stubGlobal('fetch', fetcher)
  render(<LessonClient serverLesson={1} league="bronce" mode="lesson" />)
  fireEvent.click(await screen.findByText('Responder'))
  await waitFor(() => expect(fetcher).toHaveBeenCalled())
  expect(screen.queryByText('¡Lección completada!')).toBeNull()
  expect(await screen.findByRole('alert')).toBeTruthy()
  fetcher.mockResolvedValue(new Response(JSON.stringify({ ok: true, result: { xp_awarded: 100 } })))
  fireEvent.click(screen.getByText('Reintentar guardado'))
  await screen.findByText('¡Lección completada!')
  expect(screen.getByText('+100 XP')).toBeTruthy()
})
