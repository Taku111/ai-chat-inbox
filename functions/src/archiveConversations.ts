import * as admin from 'firebase-admin'
import { onSchedule } from 'firebase-functions/v2/scheduler'

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()
const ARCHIVE_AFTER_DAYS = 365

/**
 * Weekly job: moves resolved conversations older than 1 year to archivedConversations/.
 * Uses lazy migration — only archives what it finds each run (max 50 at a time).
 * Archiving is safe to retry — documents already moved won't be found again.
 */
export const archiveConversations = onSchedule('every 168 hours', async () => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - ARCHIVE_AFTER_DAYS)
  const cutoff = admin.firestore.Timestamp.fromDate(cutoffDate)

  const resolved = await db
    .collection('conversations')
    .where('status', '==', 'resolved')
    .where('resolvedAt', '<', cutoff)
    .limit(50)
    .get()

  if (resolved.empty) {
    console.log('No conversations to archive')
    return
  }

  console.log(`Archiving ${resolved.docs.length} conversations`)

  for (const convSnap of resolved.docs) {
    const convId = convSnap.id
    const convData = convSnap.data()

    try {
      // 1. Copy conversation to archivedConversations
      await db.collection('archivedConversations').doc(convId).set(convData)

      // 2. Copy all messages to archivedConversations/{id}/messages
      const messages = await db
        .collection(`conversations/${convId}/messages`)
        .get()

      if (!messages.empty) {
        const batch = db.batch()
        messages.docs.forEach(msgSnap => {
          batch.set(
            db.doc(`archivedConversations/${convId}/messages/${msgSnap.id}`),
            msgSnap.data()
          )
        })
        await batch.commit()
      }

      // 3. Delete original conversation and messages
      const deleteBatch = db.batch()
      messages.docs.forEach(msgSnap => {
        deleteBatch.delete(msgSnap.ref)
      })
      deleteBatch.delete(convSnap.ref)
      await deleteBatch.commit()

      console.log(`Archived conversation ${convId} (${messages.docs.length} messages)`)
    } catch (err) {
      console.error(`Failed to archive conversation ${convId}:`, err)
      // Continue with next — don't let one failure block the rest
    }
  }
})
