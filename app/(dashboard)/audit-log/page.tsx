'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase/client'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { useCurrentAgent } from '@/lib/hooks/useCurrentAgent'
import type { AuditLog } from '@/types/auditLog'
import { ClipboardList } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { relativeTime } from '@/lib/utils/date'

const PAGE_SIZE = 50

export default function AuditLogPage() {
  const { agent } = useCurrentAgent()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(false)

  async function loadLogs(after?: QueryDocumentSnapshot) {
    const constraints: any[] = [orderBy('createdAt', 'desc'), limit(PAGE_SIZE)]
    if (after) constraints.push(startAfter(after))

    const snap = await getDocs(query(collection(getDb(), COLLECTIONS.AUDIT_LOGS), ...constraints))
    const newLogs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditLog)

    if (after) {
      setLogs((prev) => [...prev, ...newLogs])
    } else {
      setLogs(newLogs)
    }
    setLastVisible(snap.docs[snap.docs.length - 1] ?? null)
    setHasMore(snap.docs.length === PAGE_SIZE)
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLogs()
  }, [])

  if (agent?.role !== 'admin') {
    return <div className="p-8 text-sm text-gray-500">Admin access required.</div>
  }

  const actionColor: Record<string, string> = {
    'message.sent': 'text-green-600',
    'message.ai_sent': 'text-indigo-600',
    'message.failed': 'text-red-600',
    'agent.deactivated': 'text-red-600',
    'contact.blocked': 'text-orange-600',
    'webhook.duplicate_rejected': 'text-yellow-600',
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-bold text-gray-900">Audit Log</h1>
        <p className="text-xs text-gray-500">All agent and system actions</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No audit logs"
            description="Actions will be logged here."
          />
        ) : (
          <>
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium ${actionColor[log.action] ?? 'text-gray-700'}`}
                    >
                      {log.action}
                    </span>
                    <span className="text-xs text-gray-400">{log.agentName}</span>
                  </div>
                  {log.conversationId && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      Conv: {log.conversationId.slice(0, 16)}...
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {log.createdAt ? relativeTime(log.createdAt) : ''}
                </span>
              </div>
            ))}
            {hasMore && (
              <button
                onClick={() => loadLogs(lastVisible ?? undefined)}
                className="w-full py-3 text-sm text-green-600 hover:text-green-700 font-medium border-t border-gray-100"
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
