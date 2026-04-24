import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIClient } from './index'
import { logger } from '@/lib/logger'

export class GeminiClient implements AIClient {
  private genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? '')
  private defaultModel = process.env.AI_MODEL ?? 'gemini-1.5-flash'

  async suggest({
    systemPrompt,
    messages,
    model,
    maxTokens = 500,
    signal,
  }: Parameters<AIClient['suggest']>[0]): Promise<string> {
    const startMs = Date.now()
    try {
      const genModel = this.genAI.getGenerativeModel({
        model: model ?? this.defaultModel,
        systemInstruction: systemPrompt,
        generationConfig: { maxOutputTokens: maxTokens },
      })

      const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }))
      const lastMessage = messages[messages.length - 1]

      const chat = genModel.startChat({ history })
      const result = await chat.sendMessage(lastMessage?.content ?? '')
      const text = result.response.text()

      logger.info({ vendor: 'gemini', latencyMs: Date.now() - startMs }, 'AI call success')
      return text
    } catch (err) {
      logger.error({ vendor: 'gemini', latencyMs: Date.now() - startMs, err }, 'AI call failed')
      throw err
    }
  }
}
