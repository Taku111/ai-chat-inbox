import type { Timestamp } from 'firebase/firestore'

export interface KnowledgeBaseEntry {
  id: string
  title: string
  content: string
  category: string
  priority: number
  isActive: boolean
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  schemaVersion: 1
}

export interface CannedResponse {
  id: string
  shortcode: string
  title: string
  body: string
  category: string
  tags: string[]
  isQuickReply: boolean
  quickReplyOrder: number
  usageCount: number
  lastUsedAt: Timestamp | null
  createdBy: string
  updatedBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
  schemaVersion: 1
}
