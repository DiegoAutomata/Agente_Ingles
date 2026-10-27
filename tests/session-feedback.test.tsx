// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { useSessionAnalysis } from '@/features/tutor/hooks/useSessionAnalysis'
it('keeps a stable retry id and shows errors rather than false success', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('{"ok":false}', {status:500})); vi.stubGlobal('fetch', fetcher)
  const { result } = renderHook(() => useSessionAnalysis('conversation'))
  const messages = [{id:'1',role:'user' as const,parts:[{type:'text' as const,text:'Hello'}]}]
  await act(async () => { await result.current.save(messages) })
  expect(result.current.done).toBe(false)
  expect(result.current.error).toBeTruthy()
  const id = JSON.parse(fetcher.mock.calls[0][1].body).session_id
  fetcher.mockResolvedValue(new Response('{"ok":true,"analysis":{"wins":["Bien"],"errors":[]}}'))
  await act(async () => { await result.current.save(messages) })
  expect(JSON.parse(fetcher.mock.calls[1][1].body).session_id).toBe(id)
  expect(result.current.done).toBe(true)
  vi.unstubAllGlobals()
})
it('starts a new analysis after finishing and restarting practice', async () => {
  const fetcher = vi.fn().mockImplementation(async () => new Response('{"ok":true,"analysis":{"wins":[],"errors":[]}}')); vi.stubGlobal('fetch', fetcher)
  const { result } = renderHook(() => useSessionAnalysis('verb_drill'))
  const messages = [{id:'1',role:'user' as const,parts:[{type:'text' as const,text:'Hello'}]}]
  await act(async () => { await result.current.save(messages) })
  act(() => result.current.reset())
  expect(result.current.feedback).toBeNull()
  await act(async () => { await result.current.save(messages) })
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(JSON.parse(fetcher.mock.calls[0][1].body).session_id).not.toBe(JSON.parse(fetcher.mock.calls[1][1].body).session_id)
  vi.unstubAllGlobals()
})
