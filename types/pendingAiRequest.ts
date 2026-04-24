import type { Timestamp } from 'firebase/firestore'

export interface PendingAiRequest {
  conversationId: string
  executeAt: Timestamp
  latestMessageId: string
  mode: 'suggest' | 'auto-reply'
  createdAt: Timestamp
  updatedAt: Timestamp
}
