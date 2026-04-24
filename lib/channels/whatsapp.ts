import type { ChannelProvider, InboundMessage, OutboundMessage } from '@/types/channel'
import { getTwilioClient } from '@/lib/twilio'
import { normalizePhone } from '@/lib/utils/phone'
import { logger } from '@/lib/logger'
import twilio from 'twilio'

export const whatsappChannel: ChannelProvider = {
  name: 'whatsapp',

  async parseInbound(body: string, headers: Record<string, string>): Promise<InboundMessage[]> {
    const params = new URLSearchParams(body)

    const messageSid = params.get('MessageSid') ?? ''
    const from = params.get('From') ?? ''
    const profileName = params.get('ProfileName') ?? from
    const msgBody = params.get('Body') ?? ''
    const numMedia = parseInt(params.get('NumMedia') ?? '0', 10)

    let mediaUrl: string | undefined
    let mediaContentType: string | undefined
    let type: InboundMessage['type'] = 'text'

    if (numMedia > 0) {
      mediaUrl = params.get('MediaUrl0') ?? undefined
      mediaContentType = params.get('MediaContentType0') ?? undefined
      type = detectMediaType(mediaContentType)
    }

    const from_normalized = normalizePhone(from)

    return [{
      externalId: messageSid,
      channel: 'whatsapp',
      from: from_normalized,
      fromName: profileName,
      body: msgBody,
      type,
      mediaUrl,
      mediaContentType,
      timestamp: new Date(),
      rawPayload: Object.fromEntries(params),
    }]
  },

  async sendMessage(msg: OutboundMessage): Promise<{ externalId: string }> {
    const client = getTwilioClient()
    const result = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${msg.to}`,
      body: msg.body,
      ...(msg.mediaUrl ? { mediaUrl: [msg.mediaUrl] } : {}),
    })
    logger.info({ twilioSid: result.sid, to: msg.to }, 'WhatsApp message sent')
    return { externalId: result.sid }
  },

  async verifyWebhook(body: string, headers: Record<string, string>): Promise<boolean> {
    const signature = headers['x-twilio-signature'] ?? ''
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`
    const params = Object.fromEntries(new URLSearchParams(body))
    return twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN ?? '',
      signature,
      url,
      params
    )
  },
}

function detectMediaType(contentType: string | undefined): InboundMessage['type'] {
  if (!contentType) return 'text'
  if (contentType.startsWith('image/')) return 'image'
  if (contentType.startsWith('video/')) return 'video'
  if (contentType.startsWith('audio/')) return 'audio'
  if (contentType.includes('pdf') || contentType.startsWith('application/')) return 'document'
  return 'text'
}
