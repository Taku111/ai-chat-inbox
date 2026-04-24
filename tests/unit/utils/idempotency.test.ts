import { generateIdempotencyKey, webhookIdempotencyKey } from '@/lib/utils/idempotency'

describe('generateIdempotencyKey', () => {
  it('returns a UUID string', () => {
    const key = generateIdempotencyKey()
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })

  it('returns unique values on each call', () => {
    const a = generateIdempotencyKey()
    const b = generateIdempotencyKey()
    expect(a).not.toBe(b)
  })
})

describe('webhookIdempotencyKey', () => {
  it('creates prefixed key', () => {
    const key = webhookIdempotencyKey('whatsapp', 'SM123abc')
    expect(key).toBe('whatsapp-SM123abc')
  })

  it('is deterministic for same inputs', () => {
    const a = webhookIdempotencyKey('whatsapp', 'SMtest')
    const b = webhookIdempotencyKey('whatsapp', 'SMtest')
    expect(a).toBe(b)
  })
})
