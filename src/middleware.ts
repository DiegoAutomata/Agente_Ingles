import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const protectedPaths = [
  '/dashboard', '/conversation', '/lesson', '/vocabulary', '/writing',
  '/verb-drill', '/profile', '/challenge', '/puzzle', '/leaderboard',
]
const matchesPath = (pathname: string, paths: string[]) =>
  paths.some(path => pathname === path || pathname.startsWith(path + '/'))

export async function middleware(request: NextRequest) {
  const isProtectedPath = matchesPath(request.nextUrl.pathname, protectedPaths)
  const isAuthPath = matchesPath(request.nextUrl.pathname, ['/login', '/signup'])
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  let supabaseResponse = NextResponse.next({ request })

  function redirect(path: string) {
    const response = NextResponse.redirect(new URL(path, request.url))
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie))
    return response
  }

  if (!url || !key) {
    return isProtectedPath ? redirect('/login?error=auth_not_configured') : supabaseResponse
  }

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          const refreshed = NextResponse.next({ request })
          supabaseResponse.cookies.getAll().forEach(cookie => refreshed.cookies.set(cookie))
          cookiesToSet.forEach(({ name, value, options }) =>
            refreshed.cookies.set(name, value, options)
          )
          supabaseResponse = refreshed
        },
      },
    })
    const { data: { user } } = await supabase.auth.getUser()
    if (isProtectedPath && !user) return redirect('/login')
    if (isAuthPath && user) return redirect('/dashboard')
    return supabaseResponse
  } catch {
    return isProtectedPath ? redirect('/login?error=auth_unavailable') : supabaseResponse
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
