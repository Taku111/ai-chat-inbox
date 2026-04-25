import { GoogleGenAI } from '@google/genai'
import type { AIClient } from './index'
import { logger } from '@/lib/logger'

export class GeminiClient implements AIClient {
  private ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? '' })
  private defaultModel = process.env.AI_MODEL ?? 'gemini-2.5-flash'

  async suggest({
    systemPrompt,
    messages,
    model,
    maxTokens = 500,
    signal,
  }: Parameters<AIClient['suggest']>[0]): Promise<string> {
    const startMs = Date.now()
    try {
      const history = messages.slice(0, -1).map((m) => ({
        role: m.role === 'user' ? ('user' as const) : ('model' as const),
        parts: [{ text: m.content }],
      }))
      const lastMessage = messages[messages.length - 1]

      const chat = this.ai.chats.create({
        model: model ?? this.defaultModel,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: maxTokens,
        },
        history,
      })

      const response = await chat.sendMessage({ message: lastMessage?.content ?? '' })
      const text = response.text

      logger.info({ vendor: 'gemini', latencyMs: Date.now() - startMs }, 'AI call success')
      return text ?? ''
    } catch (err) {
      logger.error({ vendor: 'gemini', latencyMs: Date.now() - startMs, err }, 'AI call failed')
      throw err
    }
  }
}
