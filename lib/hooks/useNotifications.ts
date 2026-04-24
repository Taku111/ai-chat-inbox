'use client'

import { useEffect, useRef } from 'react'
import type { Conversation } from '@/types/conversation'

/**
 * Request browser notification permission after first login (not on page load).
 * Show a notification when a new unread message arrives in a conversation
 * that is NOT currently open in the foreground.
 */
export function useNotifications(
  conversations: Conversation[],
  currentAgentUid: string,
  activeConversationId?: string
) {
  const prevUnreadRef = useRef<Record<string, number>>({})

  useEffect(() => {
    // Request permission on mount (post-login context)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (Notification.permission !== 'granted') return

    for (const conv of conversations) {
      const agentUnread = conv.agentUnreadCounts?.[currentAgentUid] ?? 0
      const prev = prevUnreadRef.current[conv.id] ?? 0

      // New unread arrived and conversation isn't currently open
      if (agentUnread > prev && conv.id !== activeConversationId) {
        const n = new Notification(`New message from ${conv.contactName}`, {
          body: conv.lastMessage,
          icon: '/icons/icon-192.png',
          tag: conv.id, // Replace previous notification for same conversation
        })
        n.onclick = () => {
          window.focus()
          window.location.href = `/conversations/${conv.id}`
          n.close()
        }
      }

      prevUnreadRef.current[conv.id] = agentUnread
    }
  }, [conversations, currentAgentUid, activeConversationId])
}
