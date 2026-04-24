import * as admin from 'firebase-admin'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import type { PendingAiRequest } from '../../types/pendingAiRequest'

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()
const PENDING_AI_REQUESTS = 'pendingAiRequests'
const MESSAGES = (conversationId: string) => `conversations/${conversationId}/messages`

// Runs every minute (Cloud Scheduler minimum) — processes debounced AI requests
export const processAiRequests = onSchedule('every 1 minutes', async () => {
  const now = admin.firestore.Timestamp.now()
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bexley-inbox.vercel.app'
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? ''

  const due = await db
    .collection(PENDING_AI_REQUESTS)
    .where('executeAt', '<=', now)
    .limit(20)
    .get()

  if (due.empty) return

  console.log(`Processing ${due.docs.length} pending AI requests`)

  for (const docSnap of due.docs) {
    const request = docSnap.data() as PendingAiRequest

    try {
      // Mark message as pending BEFORE starting AI call — shimmer appears in agent UI
      await db
        .collection(MESSAGES(request.conversationId))
        .doc(request.latestMessageId)
        .update({ aiSuggestionPending: true })
        .catch(() => {}) // May not exist — that's ok

      if (request.mode === 'auto-reply') {
        const res = await fetch(`${APP_URL}/api/ai/auto-reply`, {
          method: 'POST',
          headers: {
            'x-webhook-secret': WEBHOOK_SECRET,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: request.conversationId,
            triggeringMessageId: request.latestMessageId,
          }),
          signal: AbortSignal.timeout(30_000),
        })
        console.log(`auto-reply for ${request.conversationId}: ${res.status}`)
      } else {
        const res = await fetch(`${APP_URL}/api/messages/ai-suggest`, {
          method: 'POST',
          headers: {
            'x-webhook-secret': WEBHOOK_SECRET,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: request.conversationId,
            messageId: request.latestMessageId,
          }),
          signal: AbortSignal.timeout(30_000),
        })
        console.log(`ai-suggest for ${request.conversationId}: ${res.status}`)
      }
    } catch (err) {
      console.error(`AI request processing failed for ${request.conversationId}:`, err)
      // Clear the pending flag so the shimmer disappears
      await db
        .collection(MESSAGES(request.conversationId))
        .doc(request.latestMessageId)
        .update({ aiSuggestionPending: false })
        .catch(() => {})
    } finally {
      // Always delete the processed request — even on failure
      await docSnap.ref.delete().catch(() => {})
    }
  }
})
