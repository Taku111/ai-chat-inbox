import type { Timestamp } from 'firebase/firestore'

export interface GlobalSettings {
  id: 'global'
  aiVendor: 'claude' | 'openai' | 'gemini'
  aiModel: string
  aiSystemPrompt: string
  aiDebounceSeconds: number
  autoReplyMaxPerHour: number
  businessName: string
  businessDescription: string
  defaultAssignment: 'round-robin' | 'manual' | null
  autoResolveAfterDays: number
  businessHoursEnabled: boolean
  businessHoursStart: string
  businessHoursEnd: string
  businessHoursTimezone: string
  outOfHoursMessage: string
  updatedAt: Timestamp
  updatedBy: string
  schemaVersion: 1
}

export interface FeatureFlags {
  messengerChannelEnabled: boolean
  instagramChannelEnabled: boolean
  analyticsEnabled: boolean
  auditLogEnabled: boolean
  knowledgeBaseEnabled: boolean
  cannedResponsesEnabled: boolean
  aiSuggestionsEnabled: boolean
  aiAutonomousModeEnabled: boolean
}
