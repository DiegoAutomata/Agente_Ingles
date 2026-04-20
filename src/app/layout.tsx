import type { Metadata } from 'next'
import './globals.css'
import PWARegister from '@/shared/components/PWARegister'

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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Agente Inglés" />
      </head>
      <body className="antialiased">
        {children}
        <PWARegister />
      </body>
    </html>
  )
}
