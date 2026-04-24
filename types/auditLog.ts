import type { Timestamp } from 'firebase/firestore'

export type AuditAction =
  | 'message.sent' | 'message.ai_sent' | 'message.ai_suggested' | 'message.failed'
  | 'conversation.assigned' | 'conversation.resolved' | 'conversation.reopened'
  | 'conversation.snoozed' | 'conversation.ai_mode_enabled' | 'conversation.ai_mode_disabled'
  | 'contact.blocked' | 'contact.unblocked'
  | 'agent.created' | 'agent.deactivated' | 'agent.role_changed'
  | 'settings.updated'
  | 'knowledge_base.created' | 'knowledge_base.updated' | 'knowledge_base.deleted'
  | 'webhook.duplicate_rejected'

export interface AuditLog {
  id: string
  action: AuditAction
  agentId: string
  agentName: string
  conversationId: string | null
  messageId: string | null
  metadata: Record<string, unknown>
  createdAt: Timestamp
}
