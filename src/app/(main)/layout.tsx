import Sidebar from '@/features/navigation/components/Sidebar'
import ThemePicker from '@/features/theme/components/ThemePicker'
import FloatingAlexChat from '@/features/tutor/components/FloatingAlexChat'
import { PushNotificationPrompt } from '@/features/notifications/components/PushNotificationPrompt'
import { createClient } from '@/lib/supabase/server'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let userId: string | undefined
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id
  } catch { /* Supabase not configured */ }

  return (
    <div className="mesh-bg min-h-screen flex">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
      <ThemePicker />
      <FloatingAlexChat />
      <PushNotificationPrompt userId={userId} />
    </div>
  )
}
