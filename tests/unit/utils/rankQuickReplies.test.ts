import { rankQuickReplies } from '@/lib/utils/rankQuickReplies'
import type { CannedResponse } from '@/types/ai'

const mockResponses: CannedResponse[] = [
  {
    id: '1',
    shortcode: 'fees',
    title: 'Fee Deadline',
    body: 'Fees are due on Friday',
    category: 'Fees',
    tags: ['fees', 'payment', 'deadline'],
    isQuickReply: true,
    quickReplyOrder: 1,
    usageCount: 50,
    lastUsedAt: null,
    createdBy: 'admin',
    updatedBy: 'admin',
    createdAt: {} as any,
    updatedAt: {} as any,
    schemaVersion: 1,
  },
  {
    id: '2',
    shortcode: 'hours',
    title: 'Opening Hours',
    body: 'School opens at 7:30am',
    category: 'Schedule',
    tags: ['hours', 'open', 'time'],
    isQuickReply: true,
    quickReplyOrder: 2,
    usageCount: 30,
    lastUsedAt: null,
    createdBy: 'admin',
    updatedBy: 'admin',
    createdAt: {} as any,
    updatedAt: {} as any,
    schemaVersion: 1,
  },
  {
    id: '3',
    shortcode: 'greeting',
    title: 'Greeting',
    body: 'Hello, how can I help?',
    category: 'General',
    tags: ['hello', 'greet'],
    isQuickReply: true,
    quickReplyOrder: 3,
    usageCount: 10,
    lastUsedAt: null,
    createdBy: 'admin',
    updatedBy: 'admin',
    createdAt: {} as any,
    updatedAt: {} as any,
    schemaVersion: 1,
  },
]

describe('rankQuickReplies', () => {
  it('ranks matching-tag responses above non-matching', () => {
    const ranked = rankQuickReplies(mockResponses, 'when are fees due?')
    expect(ranked[0].id).toBe('1') // fees response should be first
  })

  it('tie-breaks by usageCount', () => {
    const ranked = rankQuickReplies(mockResponses, 'something unrelated')
    // All score 0 — should sort by usageCount desc
    expect(ranked[0].usageCount).toBeGreaterThanOrEqual(ranked[1].usageCount)
  })

  it('returns all responses when no keywords match', () => {
    const ranked = rankQuickReplies(mockResponses, '')
    expect(ranked.length).toBe(mockResponses.length)
  })

  it('handles empty tags array gracefully', () => {
    const withEmptyTags = [{ ...mockResponses[0], tags: [] }]
    expect(() => rankQuickReplies(withEmptyTags, 'fees due')).not.toThrow()
  })
})
