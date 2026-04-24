import { adminDb } from '@/lib/firebase/admin'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { FeatureFlags } from '@/types/settings'
import { logger } from '@/lib/logger'

const TTL_MS = 60 * 1000 // 60 seconds

let cache: { flags: FeatureFlags; fetchedAt: number } | null = null

const DEFAULT_FLAGS: FeatureFlags = {
  messengerChannelEnabled: false,
  instagramChannelEnabled: false,
  analyticsEnabled: true,
  auditLogEnabled: true,
  knowledgeBaseEnabled: true,
  cannedResponsesEnabled: true,
  aiSuggestionsEnabled: true,
  aiAutonomousModeEnabled: false, // Safe default — must be explicitly enabled
}

export async function getFeatureFlags(): Promise<FeatureFlags> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) return cache.flags

  try {
    const doc = await adminDb.collection(COLLECTIONS.SETTINGS).doc('featureFlags').get()
    if (!doc.exists) {
      logger.warn('featureFlags document missing — using defaults')
      cache = { flags: DEFAULT_FLAGS, fetchedAt: Date.now() }
      return DEFAULT_FLAGS
    }
    const flags = { ...DEFAULT_FLAGS, ...doc.data() } as FeatureFlags
    cache = { flags, fetchedAt: Date.now() }
    return flags
  } catch (err) {
    logger.error({ err }, 'Failed to fetch feature flags — using defaults')
    return DEFAULT_FLAGS
  }
}
