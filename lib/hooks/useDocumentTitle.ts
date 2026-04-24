'use client'

import { useEffect } from 'react'
import type { Conversation } from '@/types/conversation'

/**
 * Updates document title to show total unread count across all conversations.
 * Shows: "(3) Bexley Inbox" when there are 3 unread messages.
 */
export function useDocumentTitle(
  conversations: Conversation[],
  currentAgentUid: string
) {
  useEffect(() => {
    const total = conversations.reduce((sum, c) => {
      return sum + (c.agentUnreadCounts?.[currentAgentUid] ?? 0)
    }, 0)

    document.title = total > 0 ? `(${total}) Bexley Inbox` : 'Bexley Inbox'

    return () => {
      document.title = 'Bexley Inbox'
    }
  }, [conversations, currentAgentUid])
}
