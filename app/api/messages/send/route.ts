import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { sendMessageSchema } from '@/lib/validators/api'
import { sanitizeMessageBody } from '@/lib/utils/sanitize'
import { whatsappChannel } from '@/lib/channels/whatsapp'
import { writeAuditLog } from '@/lib/auditLog'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

export async function POST(req: Request) {
  const startMs = Date.now()

  // 1. Verify session
  const cookieHeader = req.headers.get('cookie') ?? ''
  const sessionCookie = cookieHeader
    .split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('session='))
    ?.slice('session='.length)

  if (!sessionCookie) {
    return Response.json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  let decodedToken
  try {
    decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)
  } catch {
    return Response.json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
  }

  // 2. Validate body
  const rawBody = await req.json().catch(() => null)
  const parsed = sendMessageSchema.safeParse(rawBody)
  if (!parsed.success) {
    return Response.json({
      ok: false,
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: parsed.error.flatten(),
    }, { status: 400 })
  }

  const { messageId, conversationId, body, type, mediaUrl, idempotencyKey, isAiApproved, aiSuggestionMessageId, sentAt } = parsed.data

  // Validate sentAt is within 60 seconds
  const sentAtDate = new Date(sentAt)
  if (Math.abs(Date.now() - sentAtDate.getTime()) > 60_000) {
    return Response.json({ ok: false, error: 'sentAt timestamp out of range', code: 'VALIDATION_ERROR' }, { status: 400 })
  }

  // 3. Idempotency check — atomic create()
  const idempotencyRef = adminDb.collection(COLLECTIONS.PROCESSED_WEBHOOKS).doc(`send-${idempotencyKey}`)
  try {
    await idempotencyRef.create({
      processedAt: FieldValue.serverTimestamp(),
      type: 'outbound',
      messageId,
      expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
  } catch (err: any) {
    if (err.code === 6) {
      // Already processed — return success idempotently
      const existing = await adminDb
        .collection(COLLECTIONS.MESSAGES(conversationId))
        .doc(messageId)
        .get()
      return Response.json({ ok: true, messageId, twilioSid: existing.data()?.twilioSid ?? null })
    }
    throw err
  }

  // 4. Fetch conversation — verify it's open
  const convSnap = await adminDb.collection(COLLECTIONS.CONVERSATIONS).doc(conversationId).get()
  if (!convSnap.exists) {
    return Response.json({ ok: false, error: 'Conversation not found', code: 'NOT_FOUND' }, { status: 404 })
  }
  const conv = convSnap.data()!
  if (conv.status !== 'open' && conv.status !== 'pending') {
    return Response.json({ ok: false, error: 'Conversation is not open', code: 'VALIDATION_ERROR' }, { status: 422 })
  }

  // 5. Get agent info
  const agentSnap = await adminDb.collection(COLLECTIONS.AGENTS).doc(decodedToken.uid).get()
  const agent = agentSnap.data()

  // 6. Sanitise + write message in transaction
  const sanitizedBody = sanitizeMessageBody(body)

  await adminDb.runTransaction(async tx => {
    const msgRef = adminDb.collection(COLLECTIONS.MESSAGES(conversationId)).doc(messageId)
    tx.set(msgRef, {
      id: messageId,
      conversationId,
      direction: 'outbound',
      sender: 'agent',
      senderAgentId: decodedToken.uid,
      senderName: agent?.displayName ?? 'Agent',
      body: sanitizedBody,
      type,
      mediaUrl: mediaUrl ?? null,
      mediaContentType: null,
      status: 'sent', // ⚠️ Never 'sending' in Firestore — 'sending' is client-only
      twilioSid: null,
      externalId: null,
      idempotencyKey,
      aiSuggestion: null,
      aiSuggestionPending: false,
      isAiAutonomous: false,
      sentAt: Timestamp.fromDate(sentAtDate),
      createdAt: FieldValue.serverTimestamp(),
      schemaVersion: 1,
    })
  })

  // 7. Send via Twilio
  let twilioSid: string | null = null
  try {
    const result = await whatsappChannel.sendMessage({
      to: conv.contactPhone,
      body: sanitizedBody,
      idempotencyKey,
    })
    twilioSid = result.externalId
  } catch (err) {
    logger.error({ err, conversationId, messageId }, 'Twilio send failed')
    // Mark message as failed
    await adminDb
      .collection(COLLECTIONS.MESSAGES(conversationId))
      .doc(messageId)
      .update({ status: 'failed' })
    await writeAuditLog({
      action: 'message.failed',
      agentId: decodedToken.uid,
      agentName: agent?.displayName ?? 'Agent',
      conversationId,
      messageId,
      metadata: { error: String(err) },
    }).catch(() => {})
    return Response.json({ ok: false, error: 'Failed to send message', code: 'SEND_FAILED' }, { status: 500 })
  }

  // 8. Update message + conversation after successful send
  const updateBatch = adminDb.batch()

  updateBatch.update(adminDb.collection(COLLECTIONS.MESSAGES(conversationId)).doc(messageId), {
    twilioSid,
    externalId: twilioSid,
  })

  const convUpdates: Record<string, any> = {
    lastMessage: sanitizedBody.slice(0, 100),
    lastMessageAt: Timestamp.fromDate(sentAtDate),
    lastMessageDirection: 'outbound',
    messageCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  }

  // Set firstResponseAt only if null (first outbound message)
  if (!conv.firstResponseAt) {
    convUpdates.firstResponseAt = Timestamp.fromDate(sentAtDate)
  }

  // Clear AI suggestion reference if this was a send
  if (conv.lastAiSuggestionMessageId) {
    convUpdates.lastAiSuggestionMessageId = null
  }

  updateBatch.update(adminDb.collection(COLLECTIONS.CONVERSATIONS).doc(conversationId), convUpdates)
  await updateBatch.commit()

  // 9. Audit log (non-blocking)
  const auditAction = isAiApproved ? 'message.ai_suggested' : 'message.sent'
  await writeAuditLog({
    action: auditAction,
    agentId: decodedToken.uid,
    agentName: agent?.displayName ?? 'Agent',
    conversationId,
    messageId,
    metadata: { twilioSid, isAiApproved },
  }).catch(err => logger.error({ err }, 'Audit log failed'))

  logger.info({ latencyMs: Date.now() - startMs, conversationId, messageId }, 'Message sent')

  return Response.json({ ok: true, messageId, twilioSid })
}
