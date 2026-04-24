import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'
import { writeAuditLog } from '@/lib/auditLog'
import { logger } from '@/lib/logger'

async function requireAdmin(req: Request) {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const sessionCookie = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('session='))
    ?.slice('session='.length)
  if (!sessionCookie) return null
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)
    const agentSnap = await adminDb.collection(COLLECTIONS.AGENTS).doc(decoded.uid).get()
    if (!agentSnap.exists || agentSnap.data()?.role !== 'admin') return null
    return decoded
  } catch {
    return null
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ uid: string }> }) {
  const admin = await requireAdmin(req)
  if (!admin) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const { uid } = await params
  if (uid === admin.uid) {
    return Response.json({ ok: false, error: 'Cannot deactivate yourself' }, { status: 400 })
  }

  try {
    // 1. Set isActive = false in Firestore
    await adminDb.collection(COLLECTIONS.AGENTS).doc(uid).update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // 2. Disable Firebase Auth user
    await adminAuth.updateUser(uid, { disabled: true })

    // 3. Revoke refresh tokens — ⚠️ CRITICAL: without this, the agent's session cookie
    // stays valid for up to 5 days. Token revocation forces immediate re-authentication.
    await adminAuth.revokeRefreshTokens(uid)

    // 4. Audit log
    await writeAuditLog({
      action: 'agent.deactivated',
      agentId: admin.uid,
      metadata: { deactivatedUid: uid },
    }).catch(() => {})

    return Response.json({ ok: true })
  } catch (err) {
    logger.error({ err, uid }, 'Failed to deactivate agent')
    return Response.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ uid: string }> }) {
  const admin = await requireAdmin(req)
  if (!admin) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const { uid } = await params
  const body = await req.json().catch(() => ({}))
  const allowed = ['role', 'isActive', 'displayName']
  const updates: Record<string, any> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  updates.updatedAt = FieldValue.serverTimestamp()

  await adminDb.collection(COLLECTIONS.AGENTS).doc(uid).update(updates)

  if ('role' in updates) {
    await writeAuditLog({
      action: 'agent.role_changed',
      agentId: admin.uid,
      metadata: { targetUid: uid, newRole: updates.role },
    }).catch(() => {})
  }

  return Response.json({ ok: true })
}
