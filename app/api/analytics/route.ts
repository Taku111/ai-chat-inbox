import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { Timestamp } from 'firebase-admin/firestore'
import { logger } from '@/lib/logger'

// 5-minute cache
let cache: { metrics: any; cachedAt: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

async function getSession(req: Request) {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const sessionCookie = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('session='))
    ?.slice('session='.length)
  if (!sessionCookie) return null
  try { return await adminAuth.verifySessionCookie(sessionCookie, true) }
  catch { return null }
}

export async function GET(req: Request) {
  const session = await getSession(req)
  if (!session) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  // Return cached result if fresh
  if (cache && Date.now() - cache.cachedAt < CACHE_TTL) {
    return Response.json({ ok: true, metrics: cache.metrics })
  }

  try {
    const thirtyDaysAgo = Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))

    const [totalSnap, openSnap, resolvedSnap, aiMessagesSnap] = await Promise.all([
      adminDb.collection(COLLECTIONS.CONVERSATIONS)
        .where('createdAt', '>=', thirtyDaysAgo)
        .count().get(),
      adminDb.collection(COLLECTIONS.CONVERSATIONS)
        .where('status', 'in', ['open', 'pending'])
        .count().get(),
      adminDb.collection(COLLECTIONS.CONVERSATIONS)
        .where('status', '==', 'resolved')
        .where('resolvedAt', '>=', thirtyDaysAgo)
        .count().get(),
      adminDb.collectionGroup('messages')
        .where('isAiAutonomous', '==', true)
        .where('sentAt', '>=', thirtyDaysAgo)
        .count().get(),
    ])

    // Total messages — sum of messageCount from conversations
    const convSnap = await adminDb.collection(COLLECTIONS.CONVERSATIONS)
      .where('createdAt', '>=', thirtyDaysAgo)
      .select('messageCount', 'firstResponseAt', 'createdAt', 'resolvedAt')
      .get()

    let totalMessages = 0
    let totalResponseTimeHours = 0
    let responseTimeCount = 0

    convSnap.docs.forEach(d => {
      const data = d.data()
      totalMessages += data.messageCount ?? 0
      if (data.firstResponseAt && data.createdAt) {
        const diffHours = (data.firstResponseAt.toMillis() - data.createdAt.toMillis()) / (1000 * 60 * 60)
        if (diffHours >= 0 && diffHours < 168) { // Ignore outliers > 1 week
          totalResponseTimeHours += diffHours
          responseTimeCount++
        }
      }
    })

    const metrics = {
      totalConversations: totalSnap.data().count,
      openConversations: openSnap.data().count,
      resolvedConversations: resolvedSnap.data().count,
      totalMessages,
      aiSuggestions: 0, // Would need to count separately
      aiAutoReplies: aiMessagesSnap.data().count,
      avgResponseTimeHours: responseTimeCount > 0 ? totalResponseTimeHours / responseTimeCount : null,
    }

    cache = { metrics, cachedAt: Date.now() }
    return Response.json({ ok: true, metrics })
  } catch (err) {
    logger.error({ err }, 'Analytics query failed')
    return Response.json({ ok: false, error: 'Internal server error' }, { status: 500 })
  }
}
