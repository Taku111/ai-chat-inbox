import { adminAuth } from '@/lib/firebase/admin'

// Lightweight — called by middleware on every protected route request
export async function GET(req: Request) {
  // ⚠️ Cookie values can contain '=' characters (base64 encoding).
  // Use .slice() not .split('=')[1] — Firebase session cookies are base64 JWTs.
  const cookieHeader = req.headers.get('cookie') ?? ''
  const sessionCookie = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('session='))
    ?.slice('session='.length)

  if (!sessionCookie) {
    return Response.json({ valid: false }, { status: 401 })
  }

  try {
    await adminAuth.verifySessionCookie(sessionCookie, true) // true = check revocation
    return Response.json({ valid: true })
  } catch {
    return Response.json({ valid: false }, { status: 401 })
  }
}
