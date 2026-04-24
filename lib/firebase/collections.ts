export const COLLECTIONS = {
  AGENTS: 'agents',
  CONVERSATIONS: 'conversations',
  MESSAGES: (conversationId: string) => `conversations/${conversationId}/messages`,
  ARCHIVED_CONVERSATIONS: 'archivedConversations',
  ARCHIVED_MESSAGES: (conversationId: string) => `archivedConversations/${conversationId}/messages`,
  CONTACTS: 'contacts',
  KNOWLEDGE_BASE: 'knowledgeBase',
  CANNED_RESPONSES: 'cannedResponses',
  AUDIT_LOGS: 'auditLogs',
  SETTINGS: 'settings',
  PROCESSED_WEBHOOKS: 'processedWebhooks',
  PENDING_AI_REQUESTS: 'pendingAiRequests',
} as const
