import type { Timestamp } from 'firebase/firestore'

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
export type MessageType = 'text' | 'image' | 'document' | 'audio' | 'video' | 'template'

export interface AISuggestion {
  body: string
  quickOptions: string[]
  vendor: string
  model: string
  generatedAt: Timestamp
  approved: boolean
  approvedBy: string | null
  approvedAt: Timestamp | null
}

export interface Message {
  id: string
  conversationId: string
  direction: 'inbound' | 'outbound'
  sender: 'contact' | 'agent' | 'ai'
  senderAgentId: string | null
  senderName: string
  body: string
  type: MessageType
  mediaUrl: string | null
  mediaContentType: string | null
  status: MessageStatus
  twilioSid: string | null
  externalId: string | null
  idempotencyKey: string
  aiSuggestion: AISuggestion | null
  aiSuggestionPending: boolean
  isAiAutonomous: boolean
  sentAt: Timestamp
  createdAt: Timestamp
  schemaVersion: 1
}

export interface OptimisticMessage extends Omit<Message, 'schemaVersion'> {
  status: 'sending' | 'failed'
}
