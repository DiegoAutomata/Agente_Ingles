// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
const loseLife = vi.hoisted(() => vi.fn(() => 2))
vi.mock('@/features/lessons/hooks/useLives', () => ({useLives: () => ({lives:3,loseLife,nextRechargeAt:null})}))
vi.mock('@/features/lessons/data/lesson-content', () => ({ buildChallengeContent: () => [{type:'word_match',instruction:'Relacionar',pairs:[{left:'Dog',right:'Perro'},{left:'Cat',right:'Gato'}]}], getLessonContentAsync: vi.fn() }))
import LessonClient from '@/features/lessons/components/LessonClient'
it('consumes one life for one wrong pair and none for finishing the match', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{"ok":true,"result":{"xp_awarded":160}}')))
  render(<LessonClient serverLesson={1} league="bronce" mode="challenge" />)
  fireEvent.click(await screen.findByText('Dog')); fireEvent.click(screen.getByText('Gato'))
  fireEvent.click(screen.getByText('Dog')); fireEvent.click(screen.getByText('Perro'))
  fireEvent.click(screen.getByText('Cat')); fireEvent.click(screen.getByText('Gato'))
  await waitFor(() => expect(screen.getByText('¡Desafío completado!')).toBeTruthy(),{timeout:2000})
  expect(loseLife).toHaveBeenCalledTimes(1)
  cleanup(); vi.unstubAllGlobals()
})
