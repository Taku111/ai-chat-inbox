import type { Timestamp } from 'firebase/firestore'

export type AgentRole = 'admin' | 'agent' | 'viewer'

export interface Agent {
  uid: string
  email: string
  displayName: string
  avatarUrl?: string
  role: AgentRole
  isOnline: boolean
  isActive: boolean
  lastSeenAt: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
  schemaVersion: 1
}
