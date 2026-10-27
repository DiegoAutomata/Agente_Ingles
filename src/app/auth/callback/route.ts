import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const destination = searchParams.get('next')
  const next = destination?.startsWith('/') && !destination.startsWith('//') && !/[\\\u0000-\u0020\u007f]/.test(destination)
    ? destination
    : '/dashboard'
  const nextUrl = new URL(next, origin)
  const response = NextResponse.redirect(nextUrl.origin === origin ? nextUrl : new URL('/dashboard', origin))
  const failed = () => {
    const redirect = NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
    response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie))
    return redirect
  }

  if (!code) return failed()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.redirect(new URL('/login?error=auth_not_configured', origin))
  }

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    return error ? failed() : response
  } catch {
    return failed()
  }
}
