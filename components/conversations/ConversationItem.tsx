'use client'

import React from 'react'
import Link from 'next/link'
import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { conversationTimestamp } from '@/lib/utils/date'
import { ChannelBadge } from '@/components/shared/ChannelBadge'
import type { Conversation } from '@/types/conversation'

interface ConversationItemProps {
  conversation: Conversation
  currentAgentUid: string
}

function ConversationItemInner({ conversation: c, currentAgentUid }: ConversationItemProps) {
  const agentUnread = c.agentUnreadCounts?.[currentAgentUid] ?? 0
  const hasUnread = agentUnread > 0

  return (
    <Link
      href={`/conversations/${c.id}`}
      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
        {(c.contactName || 'U').charAt(0).toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={cn(
            'text-sm truncate',
            hasUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-800'
          )}>
            {c.contactName || c.contactPhone}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {c.aiModeEnabled && (
              <Bot className="w-3.5 h-3.5 text-indigo-500" />
            )}
            <span className="text-xs text-gray-400">
              {conversationTimestamp(c.lastMessageAt)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-gray-500 truncate max-w-[200px]">
            {c.lastMessageDirection === 'outbound' && <span className="text-gray-400">You: </span>}
            {c.lastMessage}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <ChannelBadge channel={c.channel} size="sm" />
            {hasUnread && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-xs font-bold">
                {agentUnread > 9 ? '9+' : agentUnread}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

// React.memo — compare by updatedAt to avoid re-rendering unchanged rows
export const ConversationItem = React.memo(
  ConversationItemInner,
  (prev, next) =>
    prev.conversation.updatedAt?.toMillis() === next.conversation.updatedAt?.toMillis() &&
    prev.currentAgentUid === next.currentAgentUid
)

ConversationItem.displayName = 'ConversationItem'
