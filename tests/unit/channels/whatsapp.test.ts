import { whatsappChannel } from '@/lib/channels/whatsapp'

describe('whatsappChannel.parseInbound', () => {
  const makeBody = (overrides: Record<string, string> = {}) => {
    const params = new URLSearchParams({
      MessageSid: 'SMtest123',
      From: 'whatsapp:+263771234567',
      ProfileName: 'Mrs Moyo',
      Body: 'Hello school',
      NumMedia: '0',
      ...overrides,
    })
    return params.toString()
  }

  it('parses phone number and strips whatsapp: prefix', async () => {
    const [msg] = await whatsappChannel.parseInbound(makeBody(), {})
    expect(msg.from).toBe('+263771234567')
  })

  it('parses sender name', async () => {
    const [msg] = await whatsappChannel.parseInbound(makeBody(), {})
    expect(msg.fromName).toBe('Mrs Moyo')
  })

  it('parses message body', async () => {
    const [msg] = await whatsappChannel.parseInbound(makeBody(), {})
    expect(msg.body).toBe('Hello school')
  })

  it('parses MessageSid as externalId', async () => {
    const [msg] = await whatsappChannel.parseInbound(makeBody(), {})
    expect(msg.externalId).toBe('SMtest123')
  })

  it('sets type to text for no media', async () => {
    const [msg] = await whatsappChannel.parseInbound(makeBody(), {})
    expect(msg.type).toBe('text')
  })

  it('detects image media type', async () => {
    const [msg] = await whatsappChannel.parseInbound(
      makeBody({ NumMedia: '1', MediaUrl0: 'https://example.com/img.jpg', MediaContentType0: 'image/jpeg' }),
      {}
    )
    expect(msg.type).toBe('image')
    expect(msg.mediaUrl).toBe('https://example.com/img.jpg')
  })

  it('detects audio media type', async () => {
    const [msg] = await whatsappChannel.parseInbound(
      makeBody({ NumMedia: '1', MediaUrl0: 'https://example.com/audio.ogg', MediaContentType0: 'audio/ogg' }),
      {}
    )
    expect(msg.type).toBe('audio')
  })

  it('sets channel to whatsapp', async () => {
    const [msg] = await whatsappChannel.parseInbound(makeBody(), {})
    expect(msg.channel).toBe('whatsapp')
  })

  it('throws when phone number is invalid E.164', async () => {
    await expect(
      whatsappChannel.parseInbound(makeBody({ From: 'whatsapp:notanumber' }), {})
    ).rejects.toThrow()
  })
})
