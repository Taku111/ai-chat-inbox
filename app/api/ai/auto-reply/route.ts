import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAIClient } from '@/lib/ai'
import { buildAutonomousPrompt, buildMessagesForAI } from '@/lib/ai/prompts'
import { autoReplySchema } from '@/lib/validators/api'
import { getFeatureFlags } from '@/lib/featureFlags'
import { checkRateLimit } from '@/lib/ai/rateLimiter'
import { whatsappChannel } from '@/lib/channels/whatsapp'
import { writeAuditLog } from '@/lib/auditLog'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'
import { timingSafeEqual } from 'crypto'

function constantTimeEqual(a: string, b: string): boolean {
  // ⚠️ Use timingSafeEqual to prevent timing attacks on the secret comparison
  try {
    const aBuffer = Buffer.from(a, 'utf8')
    const bBuffer = Buffer.from(b, 'utf8')
    if (aBuffer.length !== bBuffer.length) return false
    return timingSafeEqual(aBuffer, bBuffer)
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  const startMs = Date.now()

  // 1. Verify internal webhook secret (constant-time comparison)
  const providedSecret = req.headers.get('x-webhook-secret') ?? ''
  const expectedSecret = process.env.WEBHOOK_SECRET ?? ''
  if (!constantTimeEqual(providedSecret, expectedSecret)) {
    logger.warn('Auto-reply rejected — invalid webhook secret')
    return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Check global feature flag first (emergency brake)
  const flags = await getFeatureFlags()
  if (!flags.aiAutonomousModeEnabled) {
    logger.info('Auto-reply skipped — aiAutonomousModeEnabled is false')
    return Response.json({ ok: false, sent: false, reason: 'feature_disabled' })
  }

  // Validate
  const rawBody = await req.json().catch(() => null)
  const parsed = autoReplySchema.safeParse(rawBody)
  if (!parsed.success) {
    return Response.json({ ok: false, error: 'Validation error' }, { status: 400 })
  }

  const { conversationId, triggeringMessageId } = parsed.data

  // 2. Re-fetch conversation — confirm aiModeEnabled still true
  const [convSnap, settingsSnap, kbSnap] = await Promise.all([
    adminDb.collection(COLLECTIONS.CONVERSATIONS).doc(conversationId).get(),
    adminDb.collection(COLLECTIONS.SETTINGS).doc('global').get(),
    adminDb.collection(COLLECTIONS.KNOWLEDGE_BASE).where('isActive', '==', true).orderBy('priority').limit(50).get(),
  ])

  if (!convSnap.exists) {
    return Response.json({ ok: false, sent: false, reason: 'conversation_not_found' })
  }

  const conv = convSnap.data()!
  const settings = settingsSnap.data() ?? {}

  if (!conv.aiModeEnabled) {
    logger.info({ conversationId }, 'Auto-reply skipped — aiModeEnabled is false')
    return Response.json({ ok: false, sent: false, reason: 'ai_mode_disabled' })
  }

  // 3. Check contact.isBlocked
  const contactSnap = await adminDb.collection(COLLECTIONS.CONTACTS).doc(conv.contactId).get()
  const contact = contactSnap.data() ?? {}
  if (contact.isBlocked) {
    logger.info({ conversationId, contactId: conv.contactId }, 'Auto-reply skipped — contact blocked')
    return Response.json({ ok: false, sent: false, blocked: true })
  }

  // 4. Processing sentinel — prevents concurrent duplicate auto-replies
  // ⚠️ Two simultaneous Twilio retries could both pass the rate limit check before
  // either has sent. The sentinel writes before calling AI; the second sees it and aborts.
  const sentinelRef = adminDb
    .collection(COLLECTIONS.CONVERSATIONS)
    .doc(conversationId)
    .collection('meta')
    .doc('aiProcessing')

  const sentinelSnap = await sentinelRef.get()
  if (sentinelSnap.exists) {
    const data = sentinelSnap.data()!
    const startedAt = data.startedAt?.toDate?.() ?? new Date(0)
    if (Date.now() - startedAt.getTime() < 30_000) {
      logger.info({ conversationId }, 'Auto-reply skipped — processing sentinel active')
      return Response.json({ ok: false, sent: false, reason: 'concurrent_processing' })
    }
  }

  // 5. Rate limit check
  const maxPerHour = settings.autoReplyMaxPerHour ?? 10
  const withinLimit = await checkRateLimit(conversationId, maxPerHour)
  if (!withinLimit) {
    logger.info({ conversationId }, 'Auto-reply skipped — rate limit exceeded')
    return Response.json({ ok: false, sent: false, rateLimited: true })
  }

  // 6. Business hours check
  if (settings.businessHoursEnabled) {
    const tz = settings.businessHoursTimezone ?? 'Africa/Harare'
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })
    const [, hours, minutes] = formatter.format(now).match(/(\d+):(\d+)/) ?? []
    const currentMinutes = parseInt(hours) * 60 + parseInt(minutes)
    const [startH, startM] = (settings.businessHoursStart ?? '07:30').split(':').map(Number)
    const [endH, endM] = (settings.businessHoursEnd ?? '17:00').split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
      if (settings.outOfHoursMessage) {
        // Send out-of-hours message via channel
        try {
          await whatsappChannel.sendMessage({
            to: conv.contactPhone,
            body: settings.outOfHoursMessage,
            idempotencyKey: `ooh-${conversationId}-${Date.now()}`,
          })
        } catch {}
      }
      return Response.json({ ok: false, sent: false, reason: 'outside_business_hours' })
    }
  }

  // 7. Write processing sentinel
  await sentinelRef.set({ startedAt: Timestamp.now() })

  // 8. Fetch recent messages + call AI
  const messagesSnap = await adminDb
    .collection(COLLECTIONS.MESSAGES(conversationId))
    .orderBy('sentAt', 'asc')
    .limitToLast(10)
    .get()
  const recentMessages = messagesSnap.docs.map(d => d.data()) as any[]
  const kbEntries = kbSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]

  let aiText: string
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const ai = getAIClient(settings.aiVendor ?? process.env.AI_VENDOR)
    const systemPrompt = buildAutonomousPrompt({
      businessName: settings.businessName ?? 'Bexley School',
      businessDescription: settings.businessDescription ?? '',
      customSystemPrompt: settings.aiSystemPrompt ?? '',
      knowledgeBaseEntries: kbEntries,
      contact: { displayName: contact.displayName ?? conv.contactName },
      recentMessages,
      tokenBudget: 8000,
    })

    const messages = buildMessagesForAI(recentMessages)
    aiText = await ai.suggest({ systemPrompt, messages, signal: controller.signal })
  } catch (err) {
    logger.error({ err, conversationId }, 'Auto-reply AI call failed')
    Sentry.captureException(err)
    await sentinelRef.delete().catch(() => {})
    return Response.json({ ok: false, sent: false, reason: 'ai_failed' })
  } finally {
    clearTimeout(timeout)
  }

  // Parse JSON response
  let reply = aiText
  try {
    const p = JSON.parse(aiText)
    reply = p.reply ?? aiText
  } catch {}

  // 9. Send via channel
  let twilioSid: string | null = null
  try {
    const result = await whatsappChannel.sendMessage({
      to: conv.contactPhone,
      body: reply,
      idempotencyKey: `auto-${conversationId}-${triggeringMessageId}`,
    })
    twilioSid = result.externalId
  } catch (err) {
    logger.error({ err, conversationId }, 'Auto-reply Twilio send failed')
    await sentinelRef.delete().catch(() => {})
    return Response.json({ ok: false, sent: false, reason: 'send_failed' })
  }

  // 10. Save message to Firestore
  const msgRef = adminDb.collection(COLLECTIONS.MESSAGES(conversationId)).doc()
  const now = new Date()
  await msgRef.set({
    conversationId,
    direction: 'outbound',
    sender: 'ai',
    senderAgentId: null,
    senderName: 'AI (Autonomous)',
    body: reply,
    type: 'text',
    mediaUrl: null,
    mediaContentType: null,
    status: 'sent',
    twilioSid,
    externalId: twilioSid,
    idempotencyKey: `auto-${conversationId}-${triggeringMessageId}`,
    aiSuggestion: null,
    aiSuggestionPending: false,
    isAiAutonomous: true,
    sentAt: Timestamp.fromDate(now),
    createdAt: FieldValue.serverTimestamp(),
    schemaVersion: 1,
  })

  // Update conversation metadata
  await adminDb.collection(COLLECTIONS.CONVERSATIONS).doc(conversationId).update({
    lastMessage: reply.slice(0, 100),
    lastMessageAt: Timestamp.fromDate(now),
    lastMessageDirection: 'outbound',
    messageCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  })

  // 11. Delete processing sentinel
  await sentinelRef.delete().catch(() => {})

  // 12. Audit log
  await writeAuditLog({
    action: 'message.ai_sent',
    agentId: 'system',
    agentName: 'AI (Autonomous)',
    conversationId,
    messageId: msgRef.id,
    metadata: { twilioSid, vendor: settings.aiVendor ?? 'claude' },
  }).catch(() => {})

  logger.info({ latencyMs: Date.now() - startMs, conversationId, twilioSid }, 'Auto-reply sent')

  return Response.json({ ok: true, sent: true, messageId: msgRef.id, twilioSid })
}
