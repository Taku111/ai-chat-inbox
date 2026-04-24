import { adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { AuditAction } from '@/types/auditLog'
import { logger } from '@/lib/logger'

interface WriteAuditLogParams {
  action: AuditAction
  agentId?: string
  agentName?: string
  conversationId?: string | null
  messageId?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Non-blocking, non-failing audit log writer.
 * ⚠️ Always call with .catch() — an audit log failure must NEVER fail the parent operation.
 */
export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
  const {
    action,
    agentId = 'system',
    agentName = 'System',
    conversationId = null,
    messageId = null,
    metadata = {},
  } = params

  await adminDb.collection(COLLECTIONS.AUDIT_LOGS).add({
    action,
    agentId,
    agentName,
    conversationId,
    messageId,
    metadata,
    createdAt: FieldValue.serverTimestamp(),
  })
}
