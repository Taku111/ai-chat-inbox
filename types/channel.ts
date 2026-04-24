export interface InboundMessage {
  externalId: string
  channel: 'whatsapp' | 'messenger' | 'instagram'
  from: string
  fromName: string
  body: string
  type: 'text' | 'image' | 'document' | 'audio' | 'video'
  mediaUrl?: string
  mediaContentType?: string
  timestamp: Date
  rawPayload: unknown
}

export interface OutboundMessage {
  to: string
  body: string
  mediaUrl?: string
  idempotencyKey: string
}

export interface ChannelProvider {
  name: 'whatsapp' | 'messenger' | 'instagram'
  parseInbound(body: string, headers: Record<string, string>): Promise<InboundMessage[]>
  sendMessage(msg: OutboundMessage): Promise<{ externalId: string }>
  verifyWebhook(body: string, headers: Record<string, string>): Promise<boolean>
}
