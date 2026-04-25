import type { KnowledgeBaseEntry } from '@/types/ai'
import type { Contact } from '@/types/contact'
import type { Message } from '@/types/message'
import { truncateMessagesToTokenBudget } from '@/lib/utils/tokens'

const KB_TOKEN_BUDGET = 4000
const MESSAGE_TOKEN_BUDGET = 6000

export interface PromptContext {
  businessName: string
  businessDescription: string
  customSystemPrompt: string
  knowledgeBaseEntries: KnowledgeBaseEntry[]
  contact: Pick<Contact, 'displayName'>
  recentMessages: Pick<Message, 'body' | 'sentAt' | 'direction' | 'sender'>[]
  tokenBudget: number
}

export function buildSuggestionPrompt(ctx: PromptContext): string {
  const kbText = buildKnowledgeBaseSection(ctx.knowledgeBaseEntries, KB_TOKEN_BUDGET)
  return `You are a helpful customer service assistant for ${ctx.businessName}.${ctx.businessDescription ? `\nAbout: ${ctx.businessDescription}` : ''}
${ctx.customSystemPrompt}

## Knowledge Base
${kbText}

## Instructions
- Respond in the same language as the customer
- Be concise and friendly (under 3 sentences for the main reply)
- If unsure, say so and offer to have a human follow up
- Never fabricate facts — use only the knowledge base above
- No disclaimers or sign-offs
- Also generate 3 very short reply options (under 8 words each) suitable for a single tap
- Return your response as JSON: { "reply": "...", "quickOptions": ["...", "...", "..."] }
Customer: ${ctx.contact.displayName}`.trim()
}

export function buildAutonomousPrompt(ctx: PromptContext): string {
  const kbText = buildKnowledgeBaseSection(ctx.knowledgeBaseEntries, KB_TOKEN_BUDGET)
  return `You are a helpful customer service assistant for ${ctx.businessName}.${ctx.businessDescription ? `\nAbout: ${ctx.businessDescription}` : ''}
${ctx.customSystemPrompt}

## Knowledge Base
${kbText}

## Instructions
- Respond in the same language as the customer
- Be concise and friendly (under 3 sentences)
- If unsure, say a team member will follow up — never fabricate facts
- No disclaimers, sign-offs, or JSON — reply with plain text only
- ⚠️ This reply is sent automatically without human review. Be precise and conservative.
Customer: ${ctx.contact.displayName}`.trim()
}

export function buildMessagesForAI(
  messages: PromptContext['recentMessages']
): { role: 'user' | 'assistant'; content: string }[] {
  const truncated = truncateMessagesToTokenBudget(
    messages.map((m) => ({ body: m.body, sentAt: m.sentAt })),
    MESSAGE_TOKEN_BUDGET
  )

  const ids = new Set(truncated.map((_, i) => i))
  const filtered = messages.filter((_, i) => ids.has(i))

  return filtered.map((m) => ({
    role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.body,
  }))
}

function buildKnowledgeBaseSection(entries: KnowledgeBaseEntry[], budget: number): string {
  const active = entries.filter((e) => e.isActive)
  const sorted = [...active].sort((a, b) => a.priority - b.priority)
  let used = 0
  const included: string[] = []
  for (const e of sorted) {
    const text = `### ${e.title}\n${e.content}\n`
    if (used + text.length > budget) break
    included.push(text)
    used += text.length
  }
  return included.join('\n') || '(No knowledge base entries configured)'
}
