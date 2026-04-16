import Sidebar from '@/features/navigation/components/Sidebar'
import ThemePicker from '@/features/theme/components/ThemePicker'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mesh-bg min-h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <ThemePicker />
    </div>
  )
}
