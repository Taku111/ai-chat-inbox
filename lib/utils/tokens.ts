import type { Message } from '@/types/message'

/**
 * Rough token estimate: ~4 chars per token (common heuristic for English text).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Truncate messages to fit within a token budget.
 * Always keeps the most recent messages — drops oldest first.
 * Always keeps at least 1 message.
 */
export function truncateMessagesToTokenBudget(
  messages: Pick<Message, 'body' | 'sentAt'>[],
  budgetTokens: number
): typeof messages {
  if (messages.length === 0) return messages

  const sorted = [...messages].sort(
    (a, b) => a.sentAt.toMillis() - b.sentAt.toMillis()
  )

  let result = [...sorted]
  while (result.length > 1) {
    const total = result.reduce((sum, m) => sum + estimateTokens(m.body), 0)
    if (total <= budgetTokens) break
    result.shift() // remove oldest
  }

  return result
}
