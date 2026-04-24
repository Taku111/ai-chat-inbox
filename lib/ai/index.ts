export interface AIClient {
  suggest(params: {
    systemPrompt: string
    messages: { role: 'user' | 'assistant'; content: string }[]
    model?: string
    maxTokens?: number
    signal?: AbortSignal
  }): Promise<string>
}

export function getAIClient(vendor?: string): AIClient {
  const v = vendor ?? process.env.AI_VENDOR ?? 'claude'
  switch (v) {
    case 'claude': {
      const { ClaudeClient } = require('./claude')
      return new ClaudeClient()
    }
    case 'openai': {
      const { OpenAIClient } = require('./openai')
      return new OpenAIClient()
    }
    case 'gemini': {
      const { GeminiClient } = require('./gemini')
      return new GeminiClient()
    }
    default:
      throw new Error(`Unknown AI vendor: ${v}`)
  }
}
