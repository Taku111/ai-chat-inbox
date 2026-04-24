import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { writeAuditLog } from '@/lib/auditLog'
import { logger } from '@/lib/logger'
import twilio from 'twilio'

export async function POST(req: Request) {
  // Validate Content-Type
  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('application/x-www-form-urlencoded')) {
    return new Response('Bad Request', { status: 400 })
  }

  const rawBody = await req.text()
  const params = new URLSearchParams(rawBody)

  // Verify signature
  const signature = req.headers.get('x-twilio-signature') ?? ''
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp/status`
  const isValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN ?? '',
    signature,
    webhookUrl,
    Object.fromEntries(params)
  )
  if (!isValid) {
    return new Response('Unauthorized', { status: 401 })
  }

  const messageSid = params.get('MessageSid')
  const messageStatus = params.get('MessageStatus')

  if (!messageSid || !messageStatus) {
    return new Response('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } })
  }

  logger.info({ messageSid, messageStatus }, 'Twilio status callback')

  // Find the message by twilioSid
  try {
    const snap = await adminDb
      .collectionGroup('messages')
      .where('twilioSid', '==', messageSid)
      .limit(1)
      .get()

    if (!snap.empty) {
      const msgDoc = snap.docs[0]
      await msgDoc.ref.update({ status: messageStatus })

      // Audit log for failures
      if (messageStatus === 'failed' || messageStatus === 'undelivered') {
        const msgData = msgDoc.data()
        await writeAuditLog({
          action: 'message.failed',
          agentId: msgData.senderAgentId ?? 'system',
          conversationId: msgData.conversationId,
          messageId: msgDoc.id,
          metadata: { messageSid, messageStatus },
        }).catch(() => {})
      }
    }
  } catch (err) {
    logger.error({ err, messageSid }, 'Status callback processing failed')
  }

  return new Response('<Response></Response>', { headers: { 'Content-Type': 'text/xml' } })
}
