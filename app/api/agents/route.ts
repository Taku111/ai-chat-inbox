import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue } from 'firebase-admin/firestore'
import { agentCreateSchema } from '@/lib/validators/api'
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

export async function GET(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const snap = await adminDb.collection(COLLECTIONS.AGENTS).get()
  const agents = snap.docs.map(d => ({ uid: d.id, ...d.data() }))
  return Response.json({ ok: true, agents })
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req)
  if (!admin) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const rawBody = await req.json().catch(() => null)
  const parsed = agentCreateSchema.safeParse(rawBody)
  if (!parsed.success) {
    return Response.json({ ok: false, error: 'Validation error', details: parsed.error.flatten() }, { status: 400 })
  }

  const { email, displayName, role } = parsed.data

  // Create Firebase Auth user
  let uid: string
  try {
    const user = await adminAuth.createUser({ email, displayName })
    uid = user.uid
  } catch (err: any) {
    return Response.json({ ok: false, error: err.message }, { status: 400 })
  }

  // Create Firestore agent document
  // ⚠️ Compensating transaction: if Firestore write fails, delete the Auth user to prevent ghost users
  try {
    await adminDb.collection(COLLECTIONS.AGENTS).doc(uid).set({
      uid,
      email,
      displayName,
      role,
      isOnline: false,
      isActive: true,
      avatarUrl: null,
      lastSeenAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      schemaVersion: 1,
    })
  } catch (err) {
    // Compensating transaction — undo the Auth user creation
    await adminAuth.deleteUser(uid).catch(() => {})
    logger.error({ err, email }, 'Failed to create agent Firestore doc — compensated by deleting Auth user')
    return Response.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }

  // Generate password reset link (acts as invitation email)
  let passwordResetLink: string | null = null
  try {
    passwordResetLink = await adminAuth.generatePasswordResetLink(email)
  } catch (err) {
    logger.warn({ err, email }, 'Failed to generate password reset link')
  }

  await writeAuditLog({
    action: 'agent.created',
    agentId: admin.uid,
    conversationId: null,
    metadata: { newAgentUid: uid, email, role },
  }).catch(() => {})

  return Response.json({ ok: true, uid, passwordResetLink })
}
