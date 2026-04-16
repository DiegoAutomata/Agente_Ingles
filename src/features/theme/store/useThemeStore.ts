'use client'

import { create } from 'zustand'

export type ThemeMode = 'single' | 'dual'

export interface ThemePreset {
  id: string
  label: string
  bg: string
  surface?: string
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'default',   label: 'Aurora',       bg: '#020617' },
  { id: 'midnight',  label: 'Medianoche',   bg: '#0a0a1a' },
  { id: 'forest',    label: 'Bosque',       bg: '#021a0e' },
  { id: 'ocean',     label: 'Océano',       bg: '#020d1a' },
  { id: 'crimson',   label: 'Carmesí',      bg: '#1a0208' },
  { id: 'charcoal',  label: 'Carbón',       bg: '#111111' },
]

interface ThemeState {
  mode: ThemeMode
  bgColor: string
  surfaceColor: string
  setMode: (mode: ThemeMode) => void
  setBgColor: (color: string) => void
  setSurfaceColor: (color: string) => void
  applyPreset: (preset: ThemePreset) => void
  applyToDOM: () => void
}

const STORAGE_KEY = 'alex-theme'

function loadFromStorage(): Partial<ThemeState> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveToStorage(state: { mode: ThemeMode; bgColor: string; surfaceColor: string }) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const saved = loadFromStorage()

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: (saved.mode as ThemeMode) ?? 'single',
  bgColor: (saved.bgColor as string) ?? '#020617',
  surfaceColor: (saved.surfaceColor as string) ?? '#1e1e2e',

  setMode: (mode) => {
    set({ mode })
    saveToStorage({ mode, bgColor: get().bgColor, surfaceColor: get().surfaceColor })
    get().applyToDOM()
  },

  setBgColor: (color) => {
    set({ bgColor: color })
    saveToStorage({ mode: get().mode, bgColor: color, surfaceColor: get().surfaceColor })
    get().applyToDOM()
  },

  setSurfaceColor: (color) => {
    set({ surfaceColor: color })
    saveToStorage({ mode: get().mode, bgColor: get().bgColor, surfaceColor: color })
    get().applyToDOM()
  },

  applyPreset: (preset) => {
    const surfaceColor = preset.surface ?? '#1e1e2e'
    set({ bgColor: preset.bg, surfaceColor })
    saveToStorage({ mode: get().mode, bgColor: preset.bg, surfaceColor })
    get().applyToDOM()
  },

  applyToDOM: () => {
    const { mode, bgColor, surfaceColor } = get()
    const root = document.documentElement
    root.style.setProperty('--color-bg', bgColor)
    if (mode === 'dual') {
      root.style.setProperty('--color-surface', hexToRgba(surfaceColor, 0.15))
      root.style.setProperty('--color-surface-hover', hexToRgba(surfaceColor, 0.22))
      root.style.setProperty('--color-border', hexToRgba(surfaceColor, 0.25))
    } else {
      root.style.setProperty('--color-surface', 'rgba(255,255,255,0.05)')
      root.style.setProperty('--color-surface-hover', 'rgba(255,255,255,0.07)')
      root.style.setProperty('--color-border', 'rgba(255,255,255,0.08)')
    }
  },
}))
