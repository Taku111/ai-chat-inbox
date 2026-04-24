import Anthropic from '@anthropic-ai/sdk'
import type { AIClient } from './index'
import { logger } from '@/lib/logger'

export class ClaudeClient implements AIClient {
  // Class-level singleton — avoids creating new connection pools per request
  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  private defaultModel = process.env.AI_MODEL ?? 'claude-haiku-4-5-20251001'

  async suggest({
    systemPrompt,
    messages,
    model,
    maxTokens = 500,
    signal,
  }: Parameters<AIClient['suggest']>[0]): Promise<string> {
    const startMs = Date.now()
    try {
      const res = await this.client.messages.create(
        {
          model: model ?? this.defaultModel,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages,
        },
        { signal }
      )
      logger.info({ vendor: 'claude', latencyMs: Date.now() - startMs }, 'AI call success')
      return res.content[0].type === 'text' ? res.content[0].text : ''
    } catch (err) {
      logger.error({ vendor: 'claude', latencyMs: Date.now() - startMs, err }, 'AI call failed')
      throw err
    }
  }
}
