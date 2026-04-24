import { z } from 'zod'

export const sendMessageSchema = z.object({
  messageId: z.string().uuid(),
  conversationId: z.string().min(1),
  body: z.string().min(1).max(4096).trim(),
  type: z.enum(['text', 'image', 'document', 'audio', 'video', 'template']).default('text'),
  mediaUrl: z.string().url().optional(),
  idempotencyKey: z.string().uuid(),
  isAiApproved: z.boolean().optional(),
  aiSuggestionMessageId: z.string().optional(),
  sentAt: z.string().datetime(),
})

export type SendMessageBody = z.infer<typeof sendMessageSchema>

export const aiSuggestSchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
})

export const autoReplySchema = z.object({
  conversationId: z.string().min(1),
  triggeringMessageId: z.string().min(1),
})

export const agentCreateSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(100),
  role: z.enum(['admin', 'agent', 'viewer']).default('agent'),
})
