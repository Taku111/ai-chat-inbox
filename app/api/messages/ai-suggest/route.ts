import { adminDb, adminAuth } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAIClient } from '@/lib/ai'
import { buildSuggestionPrompt, buildMessagesForAI } from '@/lib/ai/prompts'
import { aiSuggestSchema } from '@/lib/validators/api'
import { getFeatureFlags } from '@/lib/featureFlags'
import { logger } from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

export async function POST(req: Request) {
  const startMs = Date.now()

  // Authenticate — either agent session or internal webhook secret
  const webhookSecret = req.headers.get('x-webhook-secret')
  const isInternal = webhookSecret && webhookSecret === process.env.WEBHOOK_SECRET

  if (!isInternal) {
    const cookieHeader = req.headers.get('cookie') ?? ''
    const sessionCookie = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('session='))
      ?.slice('session='.length)

    if (!sessionCookie) {
      return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    try {
      await adminAuth.verifySessionCookie(sessionCookie, true)
    } catch {
      return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Check feature flag
  const flags = await getFeatureFlags()
  if (!flags.aiSuggestionsEnabled) {
    return Response.json({ ok: false, error: 'AI suggestions disabled', code: 'DISABLED' }, { status: 200 })
  }

  // Validate
  const rawBody = await req.json().catch(() => null)
  const parsed = aiSuggestSchema.safeParse(rawBody)
  if (!parsed.success) {
    return Response.json({ ok: false, error: 'Validation error' }, { status: 400 })
  }

  const { conversationId, messageId } = parsed.data

  // Get conversation + contact + settings + KB
  const [convSnap, settingsSnap, kbSnap] = await Promise.all([
    adminDb.collection(COLLECTIONS.CONVERSATIONS).doc(conversationId).get(),
    adminDb.collection(COLLECTIONS.SETTINGS).doc('global').get(),
    adminDb.collection(COLLECTIONS.KNOWLEDGE_BASE).where('isActive', '==', true).orderBy('priority').limit(50).get(),
  ])

  if (!convSnap.exists) {
    return Response.json({ ok: false, error: 'Conversation not found' }, { status: 404 })
  }

  const conv = convSnap.data()!
  const settings = settingsSnap.data() ?? {}
  const kbEntries = kbSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]

  const contactSnap = await adminDb.collection(COLLECTIONS.CONTACTS).doc(conv.contactId).get()
  const contact = contactSnap.data() ?? { displayName: conv.contactName, isBlocked: false }

  // Check blocked
  if (contact.isBlocked) {
    return Response.json({ ok: false, error: 'Contact is blocked' }, { status: 200 })
  }

  // Fetch recent messages for context (last 10)
  const messagesSnap = await adminDb
    .collection(COLLECTIONS.MESSAGES(conversationId))
    .orderBy('sentAt', 'asc')
    .limitToLast(10)
    .get()

  const recentMessages = messagesSnap.docs.map(d => d.data()) as any[]

  // Mark message as pending (shimmer starts in agent UI)
  const msgRef = adminDb.collection(COLLECTIONS.MESSAGES(conversationId)).doc(messageId)
  await msgRef.update({ aiSuggestionPending: true }).catch(() => {})

  // Call AI with timeout
  let aiText: string = ''
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const ai = getAIClient(settings.aiVendor ?? process.env.AI_VENDOR)
    const systemPrompt = buildSuggestionPrompt({
      businessName: settings.businessName ?? 'Bexley School',
      businessDescription: settings.businessDescription ?? '',
      customSystemPrompt: settings.aiSystemPrompt ?? '',
      knowledgeBaseEntries: kbEntries,
      contact: { displayName: contact.displayName ?? conv.contactName },
      recentMessages,
      tokenBudget: 8000,
    })

    const messages = buildMessagesForAI(recentMessages)
    aiText = await ai.suggest({
      systemPrompt,
      messages,
      signal: controller.signal,
    })
  } catch (err) {
    logger.error({ err, conversationId, messageId }, 'AI suggestion failed')
    Sentry.captureException(err)
    // Clear pending flag — shimmer stops
    await msgRef.update({ aiSuggestionPending: false }).catch(() => {})
    return Response.json({ ok: false, suggestion: null, quickOptions: [] })
  } finally {
    clearTimeout(timeout)
  }

  // Parse JSON response (AI returns { reply, quickOptions })
  let reply = aiText
  let quickOptions: string[] = []
  try {
    const parsed = JSON.parse(aiText)
    reply = parsed.reply ?? aiText
    quickOptions = Array.isArray(parsed.quickOptions) ? parsed.quickOptions.slice(0, 3) : []
  } catch {
    // Not JSON — use raw text as reply, no quick options
  }

  // Write suggestion to message document
  const suggestion = {
    body: reply,
    quickOptions,
    vendor: settings.aiVendor ?? process.env.AI_VENDOR ?? 'claude',
    model: settings.aiModel ?? process.env.AI_MODEL ?? 'claude-haiku-4-5-20251001',
    generatedAt: Timestamp.now(),
    approved: false,
    approvedBy: null,
    approvedAt: null,
  }

  await msgRef.update({
    aiSuggestion: suggestion,
    aiSuggestionPending: false,
  })

  // Update conversation to point to this message
  await adminDb.collection(COLLECTIONS.CONVERSATIONS).doc(conversationId).update({
    lastAiSuggestionMessageId: messageId,
    updatedAt: FieldValue.serverTimestamp(),
  })

  logger.info({ latencyMs: Date.now() - startMs, conversationId, vendor: suggestion.vendor }, 'AI suggestion generated')

  return Response.json({ ok: true, suggestion: reply, quickOptions, vendor: suggestion.vendor, model: suggestion.model })
}
