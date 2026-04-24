// send.test.ts — tests for /api/messages/send route logic
// We test the business logic by calling the handler directly with mocked dependencies.

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: null, // replaced per-test
  adminAuth: { verifySessionCookie: jest.fn() },
}))
jest.mock('@/lib/channels/whatsapp', () => ({
  whatsappChannel: { sendMessage: jest.fn().mockResolvedValue({ externalId: 'SMtwilio123' }) },
}))
jest.mock('@/lib/auditLog', () => ({ writeAuditLog: jest.fn().mockResolvedValue(undefined) }))

import { mockAdminDb, mockAdminAuth, seedDoc, clearStore } from '../../mocks/firebase-admin'
import { adminAuth } from '@/lib/firebase/admin'

// Wire mock into the module
beforeEach(() => {
  clearStore()
  const adminModule = require('@/lib/firebase/admin')
  adminModule.adminDb = mockAdminDb
  adminModule.adminAuth = mockAdminAuth
  mockAdminAuth.verifySessionCookie.mockResolvedValue({ uid: 'agent-uid-1' })

  // Seed required docs
  seedDoc('agents/agent-uid-1', {
    uid: 'agent-uid-1', displayName: 'Agent Test', role: 'agent', isActive: true,
  })
  seedDoc('conversations/conv-1', {
    status: 'open', contactPhone: '+263771234567', contactId: 'contact-1',
    firstResponseAt: null, lastAiSuggestionMessageId: null, messageCount: 0,
  })
})

function makeRequest(body: any, cookie = 'session=valid-cookie') {
  return new Request('http://localhost/api/messages/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
    body: JSON.stringify(body),
  })
}

const validBody = {
  messageId: '550e8400-e29b-41d4-a716-446655440000',
  conversationId: 'conv-1',
  body: 'Hello parent',
  type: 'text',
  idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
  sentAt: new Date().toISOString(),
}

describe('POST /api/messages/send', () => {
  it('returns 401 without session cookie', async () => {
    mockAdminAuth.verifySessionCookie.mockRejectedValueOnce(new Error('No session'))
    const { POST } = await import('@/app/api/messages/send/route')
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid body', async () => {
    const { POST } = await import('@/app/api/messages/send/route')
    const res = await POST(makeRequest({ bad: 'data' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when sentAt is more than 60 seconds old', async () => {
    const { POST } = await import('@/app/api/messages/send/route')
    const oldSentAt = new Date(Date.now() - 120_000).toISOString()
    const res = await POST(makeRequest({ ...validBody, sentAt: oldSentAt }))
    expect(res.status).toBe(400)
  })

  it('returns 422 for resolved conversation', async () => {
    seedDoc('conversations/conv-1', { status: 'resolved', contactPhone: '+263771234567', contactId: 'c1' })
    const { POST } = await import('@/app/api/messages/send/route')
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(422)
  })

  it('returns 200 and includes messageId on success', async () => {
    const { POST } = await import('@/app/api/messages/send/route')
    const res = await POST(makeRequest(validBody))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(data.messageId).toBe(validBody.messageId)
  })

  it('writes message with status sent (never sending)', async () => {
    const { POST } = await import('@/app/api/messages/send/route')
    await POST(makeRequest(validBody))
    // The message doc should have status: 'sent'
    const msgDoc = await mockAdminDb.collection(`conversations/${validBody.conversationId}/messages`).doc(validBody.messageId).get()
    expect(msgDoc.data()?.status).toBe('sent')
  })

  it('returns 200 idempotently on duplicate messageId', async () => {
    const { POST } = await import('@/app/api/messages/send/route')
    // First call
    await POST(makeRequest(validBody))
    // Second call with same idempotencyKey should return 200 without sending again
    const { whatsappChannel } = require('@/lib/channels/whatsapp')
    const sendCallsBefore = whatsappChannel.sendMessage.mock.calls.length
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
    // Twilio sendMessage should NOT be called again
    expect(whatsappChannel.sendMessage.mock.calls.length).toBe(sendCallsBefore)
  })
})
