// agents.test.ts

jest.mock('@/lib/firebase/admin', () => ({ adminDb: null, adminAuth: null }))
jest.mock('@/lib/auditLog', () => ({ writeAuditLog: jest.fn().mockResolvedValue(undefined) }))

import { mockAdminDb, mockAdminAuth, seedDoc, clearStore } from '../../mocks/firebase-admin'

beforeEach(() => {
  clearStore()
  const m = require('@/lib/firebase/admin')
  m.adminDb = mockAdminDb
  m.adminAuth = mockAdminAuth
  mockAdminAuth.verifySessionCookie.mockResolvedValue({ uid: 'admin-uid' })
  seedDoc('agents/admin-uid', { uid: 'admin-uid', role: 'admin', isActive: true })
})

function makeRequest(method: string, body?: any) {
  return new Request('http://localhost/api/agents', {
    method,
    headers: { 'Content-Type': 'application/json', 'Cookie': 'session=valid' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('POST /api/agents', () => {
  it('creates Auth user + Firestore doc', async () => {
    const { POST } = await import('@/app/api/agents/route')
    const res = await POST(makeRequest('POST', {
      email: 'new@bexley.ac.zw',
      displayName: 'New Agent',
      role: 'agent',
    }))
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(mockAdminAuth.createUser).toHaveBeenCalledWith({
      email: 'new@bexley.ac.zw',
      displayName: 'New Agent',
    })
  })

  it('compensating transaction deletes Auth user when Firestore write fails', async () => {
    // Make Firestore set fail after createUser succeeds
    const failingDb = {
      collection: () => ({
        doc: () => ({
          get: async () => ({ exists: true, data: () => ({ role: 'admin', isActive: true }) }),
          set: jest.fn().mockRejectedValue(new Error('Firestore write failed')),
        }),
      }),
    }
    const m = require('@/lib/firebase/admin')
    m.adminDb = failingDb

    const { POST } = await import('@/app/api/agents/route')
    const res = await POST(makeRequest('POST', {
      email: 'fail@bexley.ac.zw',
      displayName: 'Fail Agent',
      role: 'agent',
    }))
    expect(res.status).toBe(500)
    // Auth user should be deleted
    expect(mockAdminAuth.deleteUser).toHaveBeenCalled()
  })

  it('returns 401 for non-admin session', async () => {
    seedDoc('agents/admin-uid', { uid: 'admin-uid', role: 'agent', isActive: true })
    const { POST } = await import('@/app/api/agents/route')
    const res = await POST(makeRequest('POST', { email: 'x@x.com', displayName: 'X', role: 'agent' }))
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/agents/[uid]', () => {
  it('deactivates agent and revokes refresh tokens', async () => {
    seedDoc('agents/target-uid', { uid: 'target-uid', role: 'agent', isActive: true })
    const { DELETE } = await import('@/app/api/agents/[uid]/route')
    const res = await DELETE(
      new Request('http://localhost/api/agents/target-uid', {
        method: 'DELETE',
        headers: { 'Cookie': 'session=valid' },
      }),
      { params: Promise.resolve({ uid: 'target-uid' }) }
    )
    const data = await res.json()
    expect(data.ok).toBe(true)
    expect(mockAdminAuth.revokeRefreshTokens).toHaveBeenCalledWith('target-uid')
  })
})
