'use client'

import { useEffect, useRef, useState } from 'react'
import { useThemeStore, THEME_PRESETS } from '../store/useThemeStore'

export default function ThemePicker() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { mode, bgColor, surfaceColor, setMode, setBgColor, setSurfaceColor, applyPreset, applyToDOM } = useThemeStore()

  // Aplicar tema guardado al montar
  useEffect(() => {
    applyToDOM()
  }, [applyToDOM])

  // Cerrar al hacer click fuera
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} className="fixed top-4 right-4 z-40">
      {/* Botón toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-9 h-9 rounded-xl glass-card flex items-center justify-center text-white/60 hover:text-white transition-all hover:scale-105"
        title="Personalizar colores"
      >
        🎨
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute top-11 right-0 w-72 glass-card p-4 space-y-4 shadow-2xl">
          <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Tema</p>

          {/* Presets */}
          <div className="grid grid-cols-3 gap-2">
            {THEME_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className="flex flex-col items-center gap-1 group"
                title={preset.label}
              >
                <div
                  className="w-10 h-10 rounded-xl border-2 transition-all group-hover:scale-105"
                  style={{
                    backgroundColor: preset.bg,
                    borderColor: preset.bg === bgColor ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
                  }}
                />
                <span className="text-xs text-white/50 group-hover:text-white/80">{preset.label}</span>
              </button>
            ))}
          </div>

          {/* Modo single / dual */}
          <div>
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Modo</p>
            <div className="flex gap-2">
              {(['single', 'dual'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    mode === m
                      ? 'bg-violet-500/30 text-violet-300 border border-violet-500/40'
                      : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {m === 'single' ? '1 Color' : '2 Colores'}
                </button>
              ))}
            </div>
          </div>

          {/* Color pickers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60">Fondo</span>
              <input
                type="color"
                value={bgColor}
                onChange={e => setBgColor(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
              />
            </div>
            {mode === 'dual' && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/60">Tarjetas / Sidebar</span>
                <input
                  type="color"
                  value={surfaceColor}
                  onChange={e => setSurfaceColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
