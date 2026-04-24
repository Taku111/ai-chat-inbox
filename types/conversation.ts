import type { Timestamp } from 'firebase/firestore'

export interface Conversation {
  id: string
  contactId: string
  contactName: string
  contactPhone: string
  channel: 'whatsapp' | 'messenger' | 'instagram'
  status: 'open' | 'resolved' | 'pending' | 'snoozed'
  assignedTo: string | null
  assignedToName: string | null
  unreadCount: number
  agentUnreadCounts: Record<string, number>
  lastMessage: string
  lastMessageAt: Timestamp
  lastMessageDirection: 'inbound' | 'outbound'
  lastAiSuggestionMessageId: string | null
  aiModeEnabled: boolean
  aiModeEnabledAt: Timestamp | null
  aiModeEnabledBy: string | null
  tags: string[]
  isTyping: boolean
  snoozedUntil: Timestamp | null
  resolvedAt: Timestamp | null
  firstResponseAt: Timestamp | null
  messageCount: number
  createdAt: Timestamp
  updatedAt: Timestamp
  schemaVersion: 1
}
