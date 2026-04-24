// claude.test.ts — mocks the Anthropic SDK directly

const mockCreate = jest.fn()
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }))
})

import { ClaudeClient } from '@/lib/ai/claude'

describe('ClaudeClient', () => {
  let client: ClaudeClient

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    mockCreate.mockReset()
    client = new ClaudeClient()
  })

  it('returns text content on success', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'Thank you.' }] })
    const result = await client.suggest({ systemPrompt: 'sys', messages: [{ role: 'user', content: 'hi' }] })
    expect(result).toBe('Thank you.')
  })

  it('returns empty string for non-text content block', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'image' }] })
    const result = await client.suggest({ systemPrompt: 'sys', messages: [{ role: 'user', content: 'hi' }] })
    expect(result).toBe('')
  })

  it('passes correct parameters', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] })
    await client.suggest({ systemPrompt: 'sys', messages: [{ role: 'user', content: 'msg' }], model: 'haiku', maxTokens: 100 })
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ system: 'sys', max_tokens: 100, model: 'haiku' }),
      expect.anything()
    )
  })

  it('re-throws on API failure', async () => {
    mockCreate.mockRejectedValue(new Error('overloaded'))
    await expect(client.suggest({ systemPrompt: 'sys', messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow('overloaded')
  })

  it('passes AbortSignal through', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] })
    const controller = new AbortController()
    await client.suggest({ systemPrompt: 'sys', messages: [{ role: 'user', content: 'hi' }], signal: controller.signal })
    expect(mockCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ signal: controller.signal }))
  })
})
