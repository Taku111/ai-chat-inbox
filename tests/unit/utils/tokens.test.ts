import { estimateTokens, truncateMessagesToTokenBudget } from '@/lib/utils/tokens'

const makeMsg = (body: string, offsetMs = 0) => ({
  body,
  sentAt: { toMillis: () => Date.now() + offsetMs } as any,
})

describe('estimateTokens', () => {
  it('estimates 1 token per 4 chars', () => {
    expect(estimateTokens('abcd')).toBe(1)
    expect(estimateTokens('abcdefgh')).toBe(2)
  })

  it('rounds up', () => {
    expect(estimateTokens('abc')).toBe(1)  // 3/4 = 0.75 → ceil = 1
    expect(estimateTokens('abcde')).toBe(2) // 5/4 = 1.25 → ceil = 2
  })

  it('handles empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })
})

describe('truncateMessagesToTokenBudget', () => {
  it('returns empty array for empty input', () => {
    expect(truncateMessagesToTokenBudget([], 100)).toEqual([])
  })

  it('returns messages unchanged when within budget', () => {
    const msgs = [makeMsg('hello', 0), makeMsg('world', 1000)]
    const result = truncateMessagesToTokenBudget(msgs, 1000)
    expect(result).toHaveLength(2)
  })

  it('keeps newest messages, drops oldest when over budget', () => {
    const msgs = [
      makeMsg('a'.repeat(400), 0),   // old
      makeMsg('b'.repeat(400), 1000),// newer
      makeMsg('c'.repeat(400), 2000),// newest
    ]
    // Budget: 200 tokens = 800 chars — only newest 2 fit (800 chars total)
    const result = truncateMessagesToTokenBudget(msgs, 200)
    expect(result.length).toBeLessThan(3)
    // Newest message should always be kept
    const bodies = result.map(m => m.body)
    expect(bodies).toContain('c'.repeat(400))
  })

  it('always keeps at least 1 message', () => {
    const msgs = [makeMsg('a'.repeat(10000), 0)]
    const result = truncateMessagesToTokenBudget(msgs, 1)
    expect(result).toHaveLength(1)
  })
})
