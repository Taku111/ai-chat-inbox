// featureFlags.test.ts

const mockGet = jest.fn()
jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: () => ({ doc: () => ({ get: mockGet }) }),
  },
  adminAuth: {},
}))

describe('getFeatureFlags', () => {
  beforeEach(() => {
    jest.resetModules()
    mockGet.mockReset()
  })

  it('returns flags from Firestore', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ aiAutonomousModeEnabled: true, aiSuggestionsEnabled: true }) })
    const { getFeatureFlags } = await import('@/lib/featureFlags')
    const flags = await getFeatureFlags()
    expect(flags.aiAutonomousModeEnabled).toBe(true)
  })

  it('returns defaults when document missing', async () => {
    mockGet.mockResolvedValue({ exists: false, data: () => null })
    const { getFeatureFlags } = await import('@/lib/featureFlags')
    const flags = await getFeatureFlags()
    expect(flags.aiAutonomousModeEnabled).toBe(false)
  })

  it('returns defaults on Firestore error', async () => {
    mockGet.mockRejectedValue(new Error('Firestore unavailable'))
    const { getFeatureFlags } = await import('@/lib/featureFlags')
    const flags = await getFeatureFlags()
    expect(flags.aiAutonomousModeEnabled).toBe(false)
  })

  it('aiAutonomousModeEnabled false is the safe default', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({}) })
    const { getFeatureFlags } = await import('@/lib/featureFlags')
    const flags = await getFeatureFlags()
    expect(flags.aiAutonomousModeEnabled).toBe(false)
  })

  it('caches result — only calls Firestore once within TTL', async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ aiAutonomousModeEnabled: true }) })
    const { getFeatureFlags } = await import('@/lib/featureFlags')
    await getFeatureFlags()
    await getFeatureFlags()
    expect(mockGet).toHaveBeenCalledTimes(1)
  })
})
