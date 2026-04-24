import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { whatsappChannel } from '@/lib/channels/whatsapp'
import { sanitizeMessageBody } from '@/lib/utils/sanitize'
import { normalizePhone } from '@/lib/utils/phone'
import { downloadAndRehost } from '@/lib/utils/mediaRehost'
import { writeAuditLog } from '@/lib/auditLog'
import { logger } from '@/lib/logger'
import twilio from 'twilio'
import * as Sentry from '@sentry/nextjs'

export async function POST(req: Request) {
  const startMs = Date.now()

  // Step 0: Validate Content-Type BEFORE reading body
  // ⚠️ Twilio ALWAYS sends application/x-www-form-urlencoded. A spoofed request
  // with Content-Type: application/json produces empty URLSearchParams — which
  // creates a predictable HMAC signature that could be brute-forced.
  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('application/x-www-form-urlencoded')) {
    logger.warn({ contentType }, 'Webhook rejected — unexpected Content-Type')
    return new Response('Bad Request', { status: 400 })
  }

  // Step 1: Read body once (stream consumed on first read)
  const rawBody = await req.text()
  const params = new URLSearchParams(rawBody)

  // Step 2: Verify Twilio HMAC signature FIRST
  const signature = req.headers.get('x-twilio-signature') ?? ''
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`
  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN ?? '',
    signature,
    webhookUrl,
    Object.fromEntries(params)
  )
  if (!isValid) {
    logger.warn({ ip: req.headers.get('x-forwarded-for') }, 'Invalid Twilio signature')
    return new Response('Unauthorized', { status: 401 })
  }

  // Step 3: Parse inbound message
  const [inbound] = await whatsappChannel.parseInbound(rawBody, Object.fromEntries(req.headers))
  if (!inbound) {
    return new Response('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } })
  }

  // Step 4: Idempotency check — atomic create(), not get-then-set
  // ⚠️ Two simultaneous Twilio retries can both pass a get() check before either writes.
  // adminDb.create() fails ATOMICALLY with ALREADY_EXISTS (gRPC code 6) if doc exists.
  const idempotencyKey = `whatsapp-${inbound.externalId}`
  const idempotencyRef = adminDb.collection(COLLECTIONS.PROCESSED_WEBHOOKS).doc(idempotencyKey)
  try {
    await idempotencyRef.create({
      processedAt: FieldValue.serverTimestamp(),
      externalId: inbound.externalId,
      expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day TTL
    })
  } catch (err: any) {
    if (err.code === 6) { // ALREADY_EXISTS
      logger.info({ idempotencyKey }, 'Duplicate webhook rejected')
      await writeAuditLog({
        action: 'webhook.duplicate_rejected',
        metadata: { idempotencyKey },
      }).catch(() => {})
      return new Response('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } })
    }
    throw err
  }

  // Steps 5-6: Read global settings (for debounce window)
  const settingsSnap = await adminDb.collection(COLLECTIONS.SETTINGS).doc('global').get()
  const settings = settingsSnap.data() ?? {}
  const debounceSeconds = Math.max(10, settings.aiDebounceSeconds ?? 60)

  // Step 6: Upsert contact + conversation in a TRANSACTION
  // ⚠️ Transaction prevents duplicate contact/conversation creation when two messages
  // from the same new number arrive simultaneously
  let contact: any, conversation: any
  try {
    const result = await adminDb.runTransaction(async tx => {
      // All reads before all writes (Firestore transaction requirement)
      const contactsQuery = adminDb
        .collection(COLLECTIONS.CONTACTS)
        .where('phoneNumber', '==', inbound.from)
        .limit(1)

      const [contactSnap] = (await tx.get(contactsQuery)).docs

      let contactId: string
      let contactData: any

      if (contactSnap) {
        contactId = contactSnap.id
        contactData = contactSnap.data()
      } else {
        // Create new contact
        const newContactRef = adminDb.collection(COLLECTIONS.CONTACTS).doc()
        contactId = newContactRef.id
        contactData = {
          phoneNumber: inbound.from,
          displayName: inbound.fromName || inbound.from,
          channels: ['whatsapp'],
          tags: [],
          notes: '',
          isBlocked: false,
          avatarUrl: null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          lastContactedAt: FieldValue.serverTimestamp(),
          schemaVersion: 1,
        }
        tx.set(newContactRef, contactData)
        contactData.id = contactId
      }

      // Find existing open conversation or create new
      const convsQuery = adminDb
        .collection(COLLECTIONS.CONVERSATIONS)
        .where('contactId', '==', contactId)
        .where('channel', '==', 'whatsapp')
        .where('status', 'in', ['open', 'pending'])
        .limit(1)

      const [convSnap] = (await tx.get(convsQuery)).docs

      let conversationId: string
      let conversationData: any

      if (convSnap) {
        conversationId = convSnap.id
        conversationData = convSnap.data()
        conversationData.id = conversationId
      } else {
        // Create new conversation
        const newConvRef = adminDb.collection(COLLECTIONS.CONVERSATIONS).doc()
        conversationId = newConvRef.id
        conversationData = {
          contactId,
          contactName: contactData.displayName,
          contactPhone: inbound.from,
          channel: 'whatsapp',
          status: 'open',
          assignedTo: null,
          assignedToName: null,
          unreadCount: 0,
          agentUnreadCounts: {},
          lastMessage: '',
          lastMessageAt: Timestamp.fromDate(inbound.timestamp),
          lastMessageDirection: 'inbound',
          lastAiSuggestionMessageId: null,
          aiModeEnabled: false,
          aiModeEnabledAt: null,
          aiModeEnabledBy: null,
          tags: [],
          isTyping: false,
          snoozedUntil: null,
          resolvedAt: null,
          firstResponseAt: null,
          messageCount: 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          schemaVersion: 1,
        }
        tx.set(newConvRef, conversationData)
        conversationData.id = conversationId
      }

      // Update lastContactedAt on contact
      tx.update(adminDb.collection(COLLECTIONS.CONTACTS).doc(contactId), {
        lastContactedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })

      return { contact: { ...contactData, id: contactId }, conversation: { ...conversationData, id: conversationId } }
    })

    contact = result.contact
    conversation = result.conversation
  } catch (err) {
    Sentry.captureException(err)
    logger.error({ err, from: inbound.from }, 'Transaction failed')
    return new Response('Internal Server Error', { status: 500 })
  }

  // Step 7: Download and re-host media BEFORE saving message
  // ⚠️ Twilio media URLs expire — always store Firebase Storage URL
  let finalMediaUrl: string | null = null
  if (inbound.mediaUrl) {
    finalMediaUrl = await downloadAndRehost(
      inbound.mediaUrl,
      inbound.externalId,
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    ).catch(err => {
      logger.error({ err, mediaUrl: inbound.mediaUrl }, 'Media rehost failed')
      return null
    })
  }

  // Step 8: Save message with sanitised body
  const messageRef = adminDb.collection(COLLECTIONS.MESSAGES(conversation.id)).doc()
  await messageRef.set({
    conversationId: conversation.id,
    direction: 'inbound',
    sender: 'contact',
    senderAgentId: null,
    senderName: inbound.fromName || inbound.from,
    body: sanitizeMessageBody(inbound.body),
    type: inbound.type,
    mediaUrl: finalMediaUrl,
    mediaContentType: inbound.mediaContentType ?? null,
    status: 'delivered',
    twilioSid: inbound.externalId,
    externalId: inbound.externalId,
    idempotencyKey,
    aiSuggestion: null,
    aiSuggestionPending: false,
    isAiAutonomous: false,
    sentAt: Timestamp.fromDate(inbound.timestamp),
    createdAt: FieldValue.serverTimestamp(),
    schemaVersion: 1,
  })

  // Step 9: Update conversation metadata — all counters use increment()
  const convUpdate: Record<string, any> = {
    lastMessage: inbound.body.slice(0, 100),
    lastMessageAt: Timestamp.fromDate(inbound.timestamp),
    lastMessageDirection: 'inbound',
    unreadCount: FieldValue.increment(1),
    messageCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  }

  // Per-agent unread counts — only increment for assigned agent
  if (conversation.assignedTo) {
    convUpdate[`agentUnreadCounts.${conversation.assignedTo}`] = FieldValue.increment(1)
  }

  await adminDb.collection(COLLECTIONS.CONVERSATIONS).doc(conversation.id).update(convUpdate)

  // Step 10: Prepare TwiML response BEFORE async debounce work
  const twimlResponse = new Response('<Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  })

  // Step 11: Upsert debounce record — resets the timer on every message
  // ⚠️ The webhook does NOT call AI directly — all AI work is decoupled to Cloud Scheduler.
  // This makes the webhook fast and well within Twilio's 15-second window.
  const executeAt = new Date(Date.now() + debounceSeconds * 1000)
  const aiMode = (conversation.aiModeEnabled && !contact.isBlocked) ? 'auto-reply' : 'suggest'

  await adminDb.collection(COLLECTIONS.PENDING_AI_REQUESTS).doc(conversation.id).set({
    conversationId: conversation.id,
    executeAt: Timestamp.fromDate(executeAt),
    latestMessageId: messageRef.id,
    mode: aiMode,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true })
  // merge: true = create if missing, update executeAt and latestMessageId on burst

  logger.info({
    latencyMs: Date.now() - startMs,
    conversationId: conversation.id,
    from: inbound.from,
    mode: aiMode,
  }, 'Webhook processed')

  return twimlResponse
}
