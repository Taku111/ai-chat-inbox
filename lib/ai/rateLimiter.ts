import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { Timestamp } from 'firebase-admin/firestore'
import { collection, query, where, getCountFromServer } from 'firebase/firestore'

/**
 * Check if the per-conversation autonomous reply rate limit has been exceeded.
 * Uses Firestore count() aggregation — no document downloads.
 */
export async function checkRateLimit(
  conversationId: string,
  maxPerHour: number
): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const snapshot = await adminDb
    .collection(COLLECTIONS.MESSAGES(conversationId))
    .where('isAiAutonomous', '==', true)
    .where('sentAt', '>=', Timestamp.fromDate(oneHourAgo))
    .count()
    .get()

  return snapshot.data().count < maxPerHour
}
