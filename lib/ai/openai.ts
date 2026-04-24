import OpenAI from 'openai'
import type { AIClient } from './index'
import { logger } from '@/lib/logger'

export class OpenAIClient implements AIClient {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  private defaultModel = process.env.AI_MODEL ?? 'gpt-4o-mini'

  async suggest({
    systemPrompt,
    messages,
    model,
    maxTokens = 500,
    signal,
  }: Parameters<AIClient['suggest']>[0]): Promise<string> {
    const startMs = Date.now()
    try {
      const res = await this.client.chat.completions.create(
        {
          model: model ?? this.defaultModel,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
        },
        { signal }
      )
      logger.info({ vendor: 'openai', latencyMs: Date.now() - startMs }, 'AI call success')
      return res.choices[0]?.message?.content ?? ''
    } catch (err) {
      logger.error({ vendor: 'openai', latencyMs: Date.now() - startMs, err }, 'AI call failed')
      throw err
    }
  }
}
