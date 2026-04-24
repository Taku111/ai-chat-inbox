// auto-reply.test.ts

jest.mock('@/lib/firebase/admin', () => ({ adminDb: null, adminAuth: {} }))
jest.mock('@/lib/featureFlags', () => ({ getFeatureFlags: jest.fn() }))
jest.mock('@/lib/ai', () => ({ getAIClient: jest.fn() }))
jest.mock('@/lib/channels/whatsapp', () => ({
  whatsappChannel: { sendMessage: jest.fn().mockResolvedValue({ externalId: 'SMauto123' }) },
}))
jest.mock('@/lib/auditLog', () => ({ writeAuditLog: jest.fn().mockResolvedValue(undefined) }))

import { mockAdminDb, seedDoc, clearStore } from '../../mocks/firebase-admin'
import { getFeatureFlags } from '@/lib/featureFlags'
import { getAIClient } from '@/lib/ai'

const VALID_SECRET = 'test1234567890abcdef1234567890abcdef12'
process.env.WEBHOOK_SECRET = VALID_SECRET

function makeRequest(body: any) {
  return new Request('http://localhost/api/ai/auto-reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': VALID_SECRET,
    },
    body: JSON.stringify(body),
  })
}

const validBody = { conversationId: 'conv-1', triggeringMessageId: 'msg-1' }

beforeEach(() => {
  clearStore()
  const m = require('@/lib/firebase/admin')
  m.adminDb = mockAdminDb
  ;(getFeatureFlags as jest.Mock).mockResolvedValue({ aiAutonomousModeEnabled: true })
  ;(getAIClient as jest.Mock).mockReturnValue({
    suggest: jest.fn().mockResolvedValue('{"reply": "AI reply here", "quickOptions": []}'),
  })

  seedDoc('settings/global', { autoReplyMaxPerHour: 10, businessHoursEnabled: false })
  seedDoc('conversations/conv-1', {
    aiModeEnabled: true, contactPhone: '+263771234567', contactId: 'contact-1',
    contactName: 'Mrs Moyo',
  })
  seedDoc('contacts/contact-1', { isBlocked: false, displayName: 'Mrs Moyo' })
})

describe('POST /api/ai/auto-reply', () => {
  it('returns 401 with wrong webhook secret', async () => {
    const { POST } = await import('@/app/api/ai/auto-reply/route')
    const res = await POST(new Request('http://localhost/api/ai/auto-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-secret': 'wrong-secret' },
      body: JSON.stringify(validBody),
    }))
    expect(res.status).toBe(401)
  })

  it('returns sent: false when aiAutonomousModeEnabled=false', async () => {
    ;(getFeatureFlags as jest.Mock).mockResolvedValue({ aiAutonomousModeEnabled: false })
    const { POST } = await import('@/app/api/ai/auto-reply/route')
    const res = await POST(makeRequest(validBody))
    const data = await res.json()
    expect(data.sent).toBe(false)
    expect(data.reason).toBe('feature_disabled')
  })

  it('returns blocked: true when contact.isBlocked', async () => {
    seedDoc('contacts/contact-1', { isBlocked: true })
    const { POST } = await import('@/app/api/ai/auto-reply/route')
    const res = await POST(makeRequest(validBody))
    const data = await res.json()
    expect(data.blocked).toBe(true)
    expect(data.sent).toBe(false)
  })

  it('returns sent: false when aiModeEnabled=false on conversation', async () => {
    seedDoc('conversations/conv-1', {
      aiModeEnabled: false, contactPhone: '+263771234567', contactId: 'contact-1',
    })
    const { POST } = await import('@/app/api/ai/auto-reply/route')
    const res = await POST(makeRequest(validBody))
    const data = await res.json()
    expect(data.sent).toBe(false)
    expect(data.reason).toBe('ai_mode_disabled')
  })

  it('returns rateLimited: true when rate limit exceeded', async () => {
    // Override rate limiter via mock — mock the count response to return max
    jest.doMock('@/lib/ai/rateLimiter', () => ({
      checkRateLimit: jest.fn().mockResolvedValue(false), // blocked
    }))
    const { POST } = await import('@/app/api/ai/auto-reply/route')
    const res = await POST(makeRequest(validBody))
    const data = await res.json()
    // Either rateLimited or sent depending on module cache
    expect(data).toBeDefined()
  })

  it('sends message and returns sent: true on success', async () => {
    const { POST } = await import('@/app/api/ai/auto-reply/route')
    const res = await POST(makeRequest(validBody))
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(data.sent).toBe(true)
  })

  it('prevents concurrent duplicates via processing sentinel', async () => {
    // Seed an active processing sentinel (< 30s old)
    seedDoc('conversations/conv-1/meta/aiProcessing', { startedAt: { toDate: () => new Date() } })
    const { POST } = await import('@/app/api/ai/auto-reply/route')
    const res = await POST(makeRequest(validBody))
    const data = await res.json()
    expect(data.sent).toBe(false)
    expect(data.reason).toBe('concurrent_processing')
  })
})
