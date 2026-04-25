import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/webhooks', '/api/auth']
// ⚠️ /api/webhooks must be public — Twilio cannot send session cookies
// ⚠️ /api/auth must be public — calling /api/auth/verify from here
//    would cause an infinite redirect loop if /api/auth itself were protected.

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('session')?.value
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const res = await fetch(`${request.nextUrl.origin}/api/auth/verify`, {
      headers: { Cookie: `session=${sessionCookie}` },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) {
      const redirect = NextResponse.redirect(new URL('/login', request.url))
      redirect.cookies.delete('session')
      return redirect
    }
  } catch {
    // Verification service unavailable — fail open to avoid locking everyone out
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)'],
}
