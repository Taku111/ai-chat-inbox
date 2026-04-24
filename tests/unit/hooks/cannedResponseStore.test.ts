/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
// cannedResponseStore.test.ts
// Tests the Zustand store client-side filter functions

import { useCannedResponseStore } from '@/lib/stores/cannedResponseStore'

// Mock Firestore client
jest.mock('@/lib/firebase/client', () => ({
  db: {},
}))

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  doc: jest.fn(),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  increment: jest.fn(n => n),
}))

const mockResponses = [
  {
    id: 'r1', shortcode: 'fees', title: 'Fees', body: 'Fee info',
    category: 'Fees', tags: ['fees', 'payment'], isQuickReply: true,
    quickReplyOrder: 1, usageCount: 50, lastUsedAt: null,
    createdBy: 'admin', updatedBy: 'admin', createdAt: {} as any, updatedAt: {} as any, schemaVersion: 1 as const,
  },
  {
    id: 'r2', shortcode: 'hours', title: 'Hours', body: 'School hours',
    category: 'Schedule', tags: ['hours', 'time'], isQuickReply: true,
    quickReplyOrder: 2, usageCount: 30, lastUsedAt: null,
    createdBy: 'admin', updatedBy: 'admin', createdAt: {} as any, updatedAt: {} as any, schemaVersion: 1 as const,
  },
  {
    id: 'r3', shortcode: 'policy', title: 'Policy', body: 'Long policy doc',
    category: 'General', tags: ['policy'], isQuickReply: false,
    quickReplyOrder: 10, usageCount: 2, lastUsedAt: null,
    createdBy: 'admin', updatedBy: 'admin', createdAt: {} as any, updatedAt: {} as any, schemaVersion: 1 as const,
  },
]

describe('cannedResponseStore filters', () => {
  beforeEach(() => {
    useCannedResponseStore.setState({ responses: mockResponses, lastFetchedAt: Date.now(), loading: false })
  })

  it('getByShortcode returns matching responses', () => {
    const results = useCannedResponseStore.getState().getByShortcode('fee')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('r1')
  })

  it('getByShortcode strips leading slash', () => {
    const results = useCannedResponseStore.getState().getByShortcode('/fees')
    expect(results).toHaveLength(1)
  })

  it('getByShortcode returns empty for no match', () => {
    expect(useCannedResponseStore.getState().getByShortcode('xyz')).toHaveLength(0)
  })

  it('getQuickReplies returns only isQuickReply=true', () => {
    const results = useCannedResponseStore.getState().getQuickReplies()
    expect(results.every(r => r.isQuickReply)).toBe(true)
    expect(results).toHaveLength(2)
  })

  it('getQuickReplies filters by category', () => {
    const results = useCannedResponseStore.getState().getQuickReplies('Fees')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('r1')
  })

  it('shouldRefresh returns true when never fetched', () => {
    useCannedResponseStore.setState({ lastFetchedAt: null })
    expect(useCannedResponseStore.getState().shouldRefresh()).toBe(true)
  })

  it('shouldRefresh returns false when recently fetched', () => {
    useCannedResponseStore.setState({ lastFetchedAt: Date.now() })
    expect(useCannedResponseStore.getState().shouldRefresh()).toBe(false)
  })

  it('shouldRefresh returns true when stale (> 5 min)', () => {
    useCannedResponseStore.setState({ lastFetchedAt: Date.now() - 6 * 60 * 1000 })
    expect(useCannedResponseStore.getState().shouldRefresh()).toBe(true)
  })

  it('recordUsage increments count locally', () => {
    useCannedResponseStore.getState().recordUsage('r1')
    const r = useCannedResponseStore.getState().responses.find(r => r.id === 'r1')
    expect(r?.usageCount).toBe(51)
  })
})
