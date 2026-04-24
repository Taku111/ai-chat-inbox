import * as admin from 'firebase-admin'
import { onSchedule } from 'firebase-functions/v2/scheduler'

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

// Runs every 15 minutes — reopens snoozed conversations whose snooze has expired
export const processSnoozedConversations = onSchedule('every 15 minutes', async () => {
  const now = admin.firestore.Timestamp.now()

  const snoozed = await db
    .collection('conversations')
    .where('status', '==', 'snoozed')
    .where('snoozedUntil', '<=', now)
    .limit(100)
    .get()

  if (snoozed.empty) return

  console.log(`Reopening ${snoozed.docs.length} snoozed conversations`)

  const batch = db.batch()
  for (const docSnap of snoozed.docs) {
    batch.update(docSnap.ref, {
      status: 'open',
      snoozedUntil: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    // Audit log
    batch.set(db.collection('auditLogs').doc(), {
      action: 'conversation.reopened',
      agentId: 'system',
      agentName: 'System',
      conversationId: docSnap.id,
      messageId: null,
      metadata: { reason: 'snooze_expired' },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  }

  await batch.commit()
})
