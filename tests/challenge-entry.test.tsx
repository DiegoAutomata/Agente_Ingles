// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
vi.mock('@/features/lessons/data/lesson-content', () => ({buildChallengeContent: () => [{type:'multiple_choice',question:'Should be blocked',options:['yes','no'],correct:0}],getLessonContentAsync: vi.fn()}))
import LessonClient from '@/features/lessons/components/LessonClient'
it('blocks challenge reentry with zero lives stored for this account', async () => {
  localStorage.setItem('challenge_lives:user-a',JSON.stringify({count:0,lastRecharge:Date.now()}))
  render(<LessonClient serverLesson={1} league="bronce" userId="user-a" mode="challenge" />)
  expect(await screen.findByText('Sin vidas')).toBeTruthy()
  expect(screen.queryByText('Should be blocked')).toBeNull()
  cleanup();localStorage.clear()
})
