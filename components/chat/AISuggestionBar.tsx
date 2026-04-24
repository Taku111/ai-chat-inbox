'use client'

import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { Conversation } from '@/types/conversation'
import type { Message, AISuggestion } from '@/types/message'
import { Bot, RefreshCw, Edit2, Send, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

interface AISuggestionBarProps {
  conversationId: string
  onSend: (body: string) => void
  onEditSuggestion: (text: string) => void
  onRegenerate: () => void
  conversation: Conversation | null
}

const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000 // 2 hours

export function AISuggestionBar({
  conversationId,
  onSend,
  onEditSuggestion,
  onRegenerate,
  conversation,
}: AISuggestionBarProps) {
  const [suggestionMessage, setSuggestionMessage] = useState<Message | null>(null)
  const [loadingSuggestion, setLoadingSuggestion] = useState(false)

  const messageId = conversation?.lastAiSuggestionMessageId

  useEffect(() => {
    if (!messageId || !conversationId) {
      setSuggestionMessage(null)
      return
    }

    const ref = doc(db, COLLECTIONS.MESSAGES(conversationId), messageId)
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        setSuggestionMessage({ id: snap.id, ...snap.data() } as Message)
      } else {
        setSuggestionMessage(null)
      }
    })
    return unsub
  }, [messageId, conversationId])

  if (!messageId && !loadingSuggestion) return null

  const pending = suggestionMessage?.aiSuggestionPending ?? false
  const suggestion = suggestionMessage?.aiSuggestion

  const isStale = (): boolean => {
    if (!suggestion) return false
    const genAt = suggestion.generatedAt
    if (!genAt) return false
    const genDate = typeof (genAt as any).toDate === 'function' ? (genAt as any).toDate() : new Date(genAt as any)
    if (Date.now() - genDate.getTime() > STALE_THRESHOLD_MS) return true
    return false
  }

  // State 1: Shimmer (pending, no suggestion yet)
  if (pending && !suggestion) {
    return (
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-medium text-gray-500">AI is preparing a suggestion...</span>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
        </div>
      </div>
    )
  }

  // State 2: Hidden (no suggestion)
  if (!suggestion) return null

  // State 3: Stale suggestion
  if (isStale()) {
    return (
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Bot className="w-4 h-4" />
            Suggestion is outdated
          </div>
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Regenerate
          </button>
        </div>
      </div>
    )
  }

  // State 4: Full suggestion
  return (
    <div className="border-t border-gray-100 bg-indigo-50 px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
          <Bot className="w-3.5 h-3.5" />
          AI Suggestion
          <span className="text-indigo-400 font-normal">{suggestion.vendor}</span>
        </div>
        <button
          onClick={() => {
            // Clear suggestion
            onEditSuggestion('')
          }}
          className="text-gray-400 hover:text-gray-600 p-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick options */}
      {suggestion.quickOptions && suggestion.quickOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {suggestion.quickOptions.map((opt, i) => (
            <button
              key={i}
              onClick={() => onSend(opt)}
              className="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs rounded-full font-medium transition-colors"
            >
              ✓ {opt}
            </button>
          ))}
        </div>
      )}

      {/* Full suggestion */}
      <p className="text-sm text-gray-700 mb-2 leading-relaxed">{suggestion.body}</p>

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-indigo-100 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Regenerate
        </button>
        <button
          onClick={() => onEditSuggestion(suggestion.body)}
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-indigo-100 transition-colors"
        >
          <Edit2 className="w-3 h-3" />
          Edit
        </button>
        <button
          onClick={() => onSend(suggestion.body)}
          className="flex items-center gap-1 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <Send className="w-3 h-3" />
          Send
        </button>
      </div>
    </div>
  )
}
