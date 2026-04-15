import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Alex — Tu Tutor de Inglés con IA',
  description: 'Aprende inglés profesional con un tutor de IA que te conoce y adapta su enseñanza a tus debilidades.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  )
}
