export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="mesh-bg min-h-screen flex items-center justify-center p-4">
      {children}
    </div>
  )
}
