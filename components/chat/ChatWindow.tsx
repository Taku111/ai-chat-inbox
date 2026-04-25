'use client'

import { useState, useEffect, useRef } from 'react'
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore'
import { getDb } from '@/lib/firebase/client'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { useMessages } from '@/lib/hooks/useMessages'
import { useCurrentAgent } from '@/lib/hooks/useCurrentAgent'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { AISuggestionBar } from './AISuggestionBar'
import { AIModeToggle } from './AIModeToggle'
import { QuickRepliesPanel } from './QuickRepliesPanel'
import { TopBar } from '@/components/layout/TopBar'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import type { Conversation } from '@/types/conversation'
import type { OptimisticMessage } from '@/types/message'
import { v4 as uuidv4 } from 'uuid'
import { Timestamp } from 'firebase/firestore'
import { Loader2, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

interface ChatWindowProps {
  conversationId: string
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [editSuggestionText, setEditSuggestionText] = useState('')
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const { agent } = useCurrentAgent()

  const {
    messages,
    loading,
    hasOlder,
    loadOlder,
    addOptimisticMessage,
    failMessage,
    scrollContainerRef,
  } = useMessages(conversationId)

  // Subscribe to conversation doc
  useEffect(() => {
    if (!conversationId) return
    return onSnapshot(doc(getDb(), COLLECTIONS.CONVERSATIONS, conversationId), (snap) => {
      if (snap.exists()) {
        setConversation({ id: snap.id, ...snap.data() } as Conversation)
      }
    })
  }, [conversationId])

  // Auto-scroll to bottom on new messages
  const prevMessageCount = useRef(0)
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      const container = scrollContainerRef.current
      if (container) {
        container.scrollTop = container.scrollHeight
      }
    }
    prevMessageCount.current = messages.length
  }, [messages.length, scrollContainerRef])

  // Reset unread count when conversation is opened
  useEffect(() => {
    if (!conversationId || !agent?.uid) return
    fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' }).catch(() => {})
  }, [conversationId, agent?.uid])

  async function handleSend(body: string) {
    if (!agent) return

    const messageId = uuidv4()
    const now = new Date()

    // Phase 1: Add optimistic message immediately
    const optimistic: OptimisticMessage = {
      id: messageId,
      conversationId,
      direction: 'outbound',
      sender: 'agent',
      senderAgentId: agent.uid,
      senderName: agent.displayName,
      body,
      type: 'text',
      mediaUrl: null,
      mediaContentType: null,
      status: 'sending',
      twilioSid: null,
      externalId: null,
      idempotencyKey: messageId,
      aiSuggestion: null,
      aiSuggestionPending: false,
      isAiAutonomous: false,
      sentAt: Timestamp.fromDate(now),
      createdAt: Timestamp.fromDate(now),
    }

    addOptimisticMessage(optimistic)

    // Phase 2: Send to server
    const res = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId,
        conversationId,
        body,
        type: 'text',
        idempotencyKey: messageId,
        isAiApproved: !!editSuggestionText,
        sentAt: now.toISOString(),
      }),
    })

    if (!res.ok) {
      failMessage(messageId)
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? 'Send failed')
    }

    setEditSuggestionText('')
  }

  async function handleRegenerate() {
    if (!conversation?.lastAiSuggestionMessageId) return
    try {
      await fetch('/api/messages/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messageId: conversation.lastAiSuggestionMessageId,
        }),
      })
    } catch {
      toast.error('Failed to regenerate suggestion')
    }
  }

  async function handleRequestAI() {
    if (!messages.length) return
    const lastInbound = [...messages].reverse().find((m) => m.direction === 'inbound')
    if (!lastInbound) return

    try {
      await fetch('/api/messages/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messageId: lastInbound.id,
        }),
      })
    } catch {
      toast.error('Failed to request AI suggestion')
    }
  }

  const lastInboundBody = [...messages].reverse().find((m) => m.direction === 'inbound')?.body ?? ''

  return (
    <div className="flex flex-col h-[100dvh] md:h-full">
      {/* Top bar */}
      <TopBar
        conversation={conversation ?? undefined}
        showBack
        actions={
          conversation && agent ? <AIModeToggle conversation={conversation} agent={agent} /> : null
        }
      />

      {/* Message list */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto py-2">
        {/* Load older messages button */}
        {hasOlder && (
          <div className="flex justify-center pb-2">
            <button
              onClick={loadOlder}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 py-1.5 px-3 bg-white rounded-full border border-gray-200 shadow-sm"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              Load older messages
            </button>
          </div>
        )}

        {loading && (
          <div className="flex justify-center p-4">
            <Loader2 className="w-5 h-5 text-gray-300 animate-spin" />
          </div>
        )}

        <ErrorBoundary>
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              currentAgentUid={agent?.uid ?? ''}
              onRetry={async (m) => {
                failMessage(m.id)
                try {
                  await handleSend(m.body)
                } catch {
                  toast.error('Retry failed')
                }
              }}
            />
          ))}
        </ErrorBoundary>
      </div>

      {/* Quick replies panel */}
      {showQuickReplies && (
        <QuickRepliesPanel
          lastInboundMessage={lastInboundBody}
          onSend={handleSend}
          onInsert={(text) => setEditSuggestionText(text)}
        />
      )}

      {/* AI suggestion bar */}
      {conversation && (
        <AISuggestionBar
          conversationId={conversationId}
          conversation={conversation}
          onSend={handleSend}
          onEditSuggestion={setEditSuggestionText}
          onRegenerate={handleRegenerate}
        />
      )}

      {/* Message input */}
      <MessageInput
        conversationId={conversationId}
        aiModeEnabled={conversation?.aiModeEnabled ?? false}
        initialValue={editSuggestionText}
        onSend={handleSend}
        onAfterSend={() => setEditSuggestionText('')}
        onRequestAISuggestion={handleRequestAI}
        onToggleQuickReplies={() => setShowQuickReplies((s) => !s)}
      />
    </div>
  )
}
