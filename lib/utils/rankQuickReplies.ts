import type { CannedResponse } from '@/types/ai'

/**
 * Client-side ranking of quick replies based on keyword overlap with the last inbound message.
 * Zero Firestore reads — operates on the already-loaded store.
 */
export function rankQuickReplies(
  responses: CannedResponse[],
  inboundMessageBody: string
): CannedResponse[] {
  const words = inboundMessageBody.toLowerCase().split(/\s+/)

  return [...responses].sort((a, b) => {
    const scoreA = a.tags.filter(tag => words.some(w => w.includes(tag.toLowerCase()))).length
    const scoreB = b.tags.filter(tag => words.some(w => w.includes(tag.toLowerCase()))).length
    if (scoreB !== scoreA) return scoreB - scoreA
    return b.usageCount - a.usageCount
  })
}
