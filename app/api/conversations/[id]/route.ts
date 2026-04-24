import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'
import { writeAuditLog } from '@/lib/auditLog'

async function getSession(req: Request) {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const sessionCookie = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('session='))
    ?.slice('session='.length)
  if (!sessionCookie) return null
  try {
    return await adminAuth.verifySessionCookie(sessionCookie, true)
  } catch {
    return null
  }
}

// Reset unread count when agent opens conversation
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const url = new URL(req.url)
  if (!url.pathname.endsWith('/read')) {
    return Response.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  const session = await getSession(req)
  if (!session) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Reset this agent's unread count atomically using a transaction
  await adminDb.runTransaction(async tx => {
    const convRef = adminDb.collection(COLLECTIONS.CONVERSATIONS).doc(id)
    const convSnap = await tx.get(convRef)
    if (!convSnap.exists) return

    const data = convSnap.data()!
    const agentUnread = data.agentUnreadCounts?.[session.uid] ?? 0
    if (agentUnread === 0) return

    tx.update(convRef, {
      [`agentUnreadCounts.${session.uid}`]: 0,
      unreadCount: FieldValue.increment(-agentUnread),
      updatedAt: FieldValue.serverTimestamp(),
    })
  })

  return Response.json({ ok: true })
}
