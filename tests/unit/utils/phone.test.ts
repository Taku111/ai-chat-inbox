import { normalizePhone, isE164, stripWhatsAppPrefix } from '@/lib/utils/phone'

describe('normalizePhone', () => {
  it('returns valid E.164 phone unchanged', () => {
    expect(normalizePhone('+263771234567')).toBe('+263771234567')
  })

  it('strips whatsapp: prefix', () => {
    expect(normalizePhone('whatsapp:+263771234567')).toBe('+263771234567')
  })

  it('throws for invalid E.164', () => {
    expect(() => normalizePhone('not-a-number')).toThrow()
    expect(() => normalizePhone('0771234567')).toThrow()
  })

  it('trims whitespace', () => {
    expect(normalizePhone('  +263771234567  ')).toBe('+263771234567')
  })
})

describe('isE164', () => {
  it('returns true for valid E.164', () => {
    expect(isE164('+263771234567')).toBe(true)
    expect(isE164('+1234567890')).toBe(true)
  })

  it('returns false for invalid formats', () => {
    expect(isE164('0771234567')).toBe(false)
    expect(isE164('+12345')).toBe(false)
    expect(isE164('')).toBe(false)
  })
})

describe('stripWhatsAppPrefix', () => {
  it('strips prefix', () => {
    expect(stripWhatsAppPrefix('whatsapp:+263771234567')).toBe('+263771234567')
  })

  it('returns unchanged if no prefix', () => {
    expect(stripWhatsAppPrefix('+263771234567')).toBe('+263771234567')
  })
})
