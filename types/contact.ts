import type { Timestamp } from 'firebase/firestore'

export interface Contact {
  id: string
  phoneNumber: string
  displayName: string
  avatarUrl?: string
  channels: ('whatsapp' | 'messenger' | 'instagram')[]
  tags: string[]
  notes: string
  isBlocked: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  lastContactedAt: Timestamp
  schemaVersion: 1
}
