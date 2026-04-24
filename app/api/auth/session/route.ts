import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body?.idToken) {
    return Response.json({ error: 'Missing idToken' }, { status: 400 })
  }

  let decoded
  try {
    decoded = await adminAuth.verifyIdToken(body.idToken)
  } catch {
    return Response.json({ error: 'Invalid token' }, { status: 401 })
  }

  const agentDoc = await adminDb.collection(COLLECTIONS.AGENTS).doc(decoded.uid).get()
  if (!agentDoc.exists || !agentDoc.data()?.isActive) {
    return Response.json({ error: 'Not an authorised agent' }, { status: 403 })
  }

  try {
    const sessionCookie = await adminAuth.createSessionCookie(body.idToken, {
      expiresIn: 5 * 24 * 60 * 60 * 1000, // 5 days
    })

    const response = Response.json({ ok: true })
    // HttpOnly: JS cannot read (XSS protection), Secure: HTTPS only, SameSite=Lax: CSRF protection
    response.headers.set(
      'Set-Cookie',
      `session=${sessionCookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${5 * 24 * 60 * 60}`
    )
    return response
  } catch (err) {
    logger.error({ err, uid: decoded.uid }, 'Failed to create session cookie')
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = Response.json({ ok: true })
  response.headers.set('Set-Cookie', 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0')
  return response
}
