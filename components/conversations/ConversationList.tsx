'use client'

import { useState } from 'react'
import { useConversations } from '@/lib/hooks/useConversations'
import { useCurrentAgent } from '@/lib/hooks/useCurrentAgent'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { useDocumentTitle } from '@/lib/hooks/useDocumentTitle'
import { ConversationItem } from './ConversationItem'
import { EmptyState } from '@/components/shared/EmptyState'
import { MessageSquare, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type TabType = 'open' | 'pending' | 'resolved' | 'all'

const TABS: { id: TabType; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'pending', label: 'Pending' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All' },
]

export function ConversationList() {
  const [activeTab, setActiveTab] = useState<TabType>('open')
  const { agent } = useCurrentAgent()
  const { conversations, loading, error, loadMore, hasMore } = useConversations(activeTab)

  // Browser notifications + document title for unread counts
  useNotifications(conversations, agent?.uid ?? '')
  useDocumentTitle(conversations, agent?.uid ?? '')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-bold text-gray-900 mb-3">Inbox</h1>
        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-100 m-3 rounded-lg">
            Failed to load conversations. Please reload.
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <EmptyState
            icon={MessageSquare}
            title="No conversations"
            description={activeTab === 'open' ? "New parent messages will appear here." : `No ${activeTab} conversations.`}
          />
        )}

        {conversations.map(conversation => (
          <ConversationItem
            key={conversation.id}
            conversation={conversation}
            currentAgentUid={agent?.uid ?? ''}
          />
        ))}

        {hasMore && (
          <button
            onClick={loadMore}
            className="w-full py-3 text-sm text-green-600 hover:text-green-700 font-medium border-t border-gray-100"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  )
}
