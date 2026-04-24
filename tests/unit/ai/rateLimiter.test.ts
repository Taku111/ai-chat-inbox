// rateLimiter.test.ts — tests the rate limit logic
// We mock the adminDb to control what Firestore returns

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    count: jest.fn().mockReturnThis(),
    get: jest.fn(),
  },
}))

import { checkRateLimit } from '@/lib/ai/rateLimiter'
import { adminDb } from '@/lib/firebase/admin'

const mockGet = (count: number) => {
  (adminDb.collection('').where('', '', '').count().get as jest.Mock).mockResolvedValue({
    data: () => ({ count }),
  })
}

// Reset mock chain each time
function setupMock() {
  const mockCount = { get: jest.fn() }
  const mockWhere2 = { where: jest.fn().mockReturnValue({ count: jest.fn().mockReturnValue(mockCount) }) }
  const mockWhere1 = { where: jest.fn().mockReturnValue(mockWhere2) }
  const mockCollection = jest.fn().mockReturnValue(mockWhere1);
  (adminDb.collection as jest.Mock) = mockCollection
  return mockCount
}

describe('checkRateLimit', () => {
  it('returns true (allowed) when under limit', async () => {
    const mockCount = setupMock()
    mockCount.get.mockResolvedValue({ data: () => ({ count: 5 }) })
    const allowed = await checkRateLimit('conv-1', 10)
    expect(allowed).toBe(true)
  })

  it('returns false (blocked) at or over limit', async () => {
    const mockCount = setupMock()
    mockCount.get.mockResolvedValue({ data: () => ({ count: 10 }) })
    const allowed = await checkRateLimit('conv-1', 10)
    expect(allowed).toBe(false)
  })

  it('returns false when well over limit', async () => {
    const mockCount = setupMock()
    mockCount.get.mockResolvedValue({ data: () => ({ count: 100 }) })
    const allowed = await checkRateLimit('conv-1', 10)
    expect(allowed).toBe(false)
  })

  it('returns true when count is 0 (no messages yet)', async () => {
    const mockCount = setupMock()
    mockCount.get.mockResolvedValue({ data: () => ({ count: 0 }) })
    const allowed = await checkRateLimit('conv-1', 10)
    expect(allowed).toBe(true)
  })
})
