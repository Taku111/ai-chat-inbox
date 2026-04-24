import { sanitizeMessageBody } from '@/lib/utils/sanitize'

describe('sanitizeMessageBody', () => {
  it('trims whitespace', () => {
    expect(sanitizeMessageBody('  hello  ')).toBe('hello')
  })

  it('strips null bytes', () => {
    expect(sanitizeMessageBody('hello\0world')).toBe('helloworld')
  })

  it('truncates to 4096 chars', () => {
    const long = 'a'.repeat(5000)
    expect(sanitizeMessageBody(long).length).toBe(4096)
  })

  it('preserves emoji', () => {
    expect(sanitizeMessageBody('Hello 🎉')).toBe('Hello 🎉')
  })

  it('preserves non-ASCII', () => {
    expect(sanitizeMessageBody('Chokwadi ndezvei 😊')).toBe('Chokwadi ndezvei 😊')
  })
})
