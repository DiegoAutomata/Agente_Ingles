// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import FlashcardDeck, { type WordCard } from '../src/features/vocabulary/components/FlashcardDeck'

const word: WordCard = {
  id: 3, word: 'to go', phonetic: '(tu gou)', translation: 'ir',
  example_en: 'We go home.', example_es: 'Vamos a casa.',
  isNew: false, isDue: true, interval: 1, repetitions: 1, easeFactor: 2.5,
}

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('vocabulary review', () => {
  it.each([401, 500])('keeps the card and offers retry when saving returns %s', async (status) => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ ok: false }, { status }))
    vi.stubGlobal('fetch', fetchMock)
    render(<FlashcardDeck words={[word]} />)
    fireEvent.click(screen.getByRole('button', { name: /Empezar repaso/ }))
    fireEvent.click(screen.getByText('Toca para revelar →'))
    fireEvent.click(screen.getByRole('button', { name: /Bien/ }))

    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(screen.getByText('to go')).toBeTruthy()
    expect(screen.queryByText('¡Repaso completado!')).toBeNull()
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeTruthy()

    fetchMock.mockResolvedValue(Response.json({
      ok: true, review: { wordId: 3, interval: 6, repetitions: 2, easeFactor: 2.5, nextReviewAt: '2099-01-01T00:00:00Z', mastered: false },
    }))
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/ }))
    await waitFor(() => expect(screen.getByText('¡Repaso completado!')).toBeTruthy())
  })

  it('keeps scheduled words out of today’s deck without calling them mastered', () => {
    render(<FlashcardDeck words={[{ ...word, isDue: false }]} />)
    expect(screen.queryByRole('button', { name: /Empezar repaso/ })).toBeNull()
    expect(screen.getByText(/¡Todo al día!/)).toBeTruthy()
    expect(screen.queryByText(/Dominadas/)).toBeNull()
  })

  it('does not offer the saved word again when returning to the deck', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      ok: true, review: { wordId: 3, interval: 6, repetitions: 2, easeFactor: 2.5, nextReviewAt: '2099-01-01T00:00:00Z', mastered: false },
    })))
    render(<FlashcardDeck words={[word]} />)
    fireEvent.click(screen.getByRole('button', { name: /Empezar repaso/ }))
    fireEvent.click(screen.getByText('Toca para revelar →'))
    fireEvent.click(screen.getByRole('button', { name: /Bien/ }))
    await screen.findByText('¡Repaso completado!')
    fireEvent.click(screen.getByRole('button', { name: /Ver mazo/ }))
    expect(screen.queryByRole('button', { name: /Empezar repaso/ })).toBeNull()
    expect(screen.getByText(/¡Todo al día!/)).toBeTruthy()
  })

  it('offers a native keyboard-accessible button to reveal the translation', () => {
    render(<FlashcardDeck words={[word]} />)
    fireEvent.click(screen.getByRole('button', { name: /Empezar repaso/ }))
    const reveal = screen.getByRole('button', { name: /Revelar traducción/ })
    expect(reveal.tagName).toBe('BUTTON')
    expect(screen.queryByRole('button', { name: /Bien/ })).toBeNull()
    fireEvent.click(reveal)
    expect(screen.getByRole('button', { name: /Bien/ })).toBeTruthy()
  })

  it('pronounces the current word with an English voice', () => {
    const speak = vi.fn()
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), getVoices: () => [{ lang: 'es-AR' }, { lang: 'en-US' }] })
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      text: string
      constructor(text: string) { this.text = text }
    })
    render(<FlashcardDeck words={[word]} />)
    fireEvent.click(screen.getByRole('button', { name: /Empezar repaso/ }))
    fireEvent.click(screen.getByRole('button', { name: /Escuchar en inglés/ }))
    expect(speak.mock.calls[0][0]).toMatchObject({ text: 'to go', lang: 'en-US', voice: { lang: 'en-US' } })
  })
})
