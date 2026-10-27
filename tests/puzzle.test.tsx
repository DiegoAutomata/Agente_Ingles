// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import Puzzle from '@/app/(main)/puzzle/page'
afterEach(() => {cleanup();vi.restoreAllMocks()})
it('shows the letters for the same word as the initial clue', () => {
  vi.spyOn(Math, 'random').mockReturnValueOnce(0).mockReturnValue(0.1)
  render(<Puzzle />)
  expect(screen.getByText('venir')).toBeTruthy()
  expect(screen.getAllByText(/^[a-z]$/i).map(node => node.textContent).sort().join('')).toBe('cemo')
})
