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
        {process.env.LOCAL_PREVIEW === '1' && <div className="bg-amber-100 text-amber-950 px-4 py-2 text-sm text-center">
          Evaluación local · Datos de prueba · IA, correos y notificaciones reales desactivados
        </div>}
        {children}
        <PWARegister />
      </body>
    </html>
  )
}
