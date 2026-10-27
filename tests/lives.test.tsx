// @vitest-environment jsdom
import { act, renderHook, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useLives } from '@/features/lessons/hooks/useLives'
afterEach(() => {cleanup();localStorage.clear();vi.useRealTimers()})
it('recovers from invalid browser storage rather than crashing a challenge', () => {
  localStorage.setItem('challenge_lives:user-a', '{invalid')
  const { result } = renderHook(() => useLives(true, 'user-a'))
  expect(result.current.lives).toBe(3)
})
it('isolates lives by account and recharges an open challenge', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-27T12:00:00Z'))
  const { result, rerender } = renderHook(({user}) => useLives(true,user), {initialProps:{user:'a'}})
  act(() => {result.current.loseLife()})
  expect(result.current.lives).toBe(2)
  rerender({user:'b'});expect(result.current.lives).toBe(3)
  rerender({user:'a'});expect(result.current.lives).toBe(2)
  act(() => {vi.advanceTimersByTime(4*60*60*1000)})
  expect(result.current.lives).toBe(3)
})
