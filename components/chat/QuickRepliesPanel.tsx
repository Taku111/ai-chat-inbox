'use client'

import { useState, useMemo } from 'react'
import { Zap, ChevronDown, ChevronUp, Send, X } from 'lucide-react'
import { useCannedResponseStore } from '@/lib/stores/cannedResponseStore'
import { rankQuickReplies } from '@/lib/utils/rankQuickReplies'
import { cn } from '@/lib/utils'

interface QuickRepliesPanelProps {
  lastInboundMessage?: string
  onSend: (body: string) => void
  onInsert: (body: string) => void
}

export function QuickRepliesPanel({ lastInboundMessage = '', onSend, onInsert }: QuickRepliesPanelProps) {
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('quickRepliesPanelOpen') !== 'false'
    }
    return true
  })
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const { responses } = useCannedResponseStore()

  const quickReplies = useMemo(() => {
    const all = responses.filter(r => r.isQuickReply)
    const filtered = selectedCategory
      ? all.filter(r => r.category === selectedCategory)
      : all
    return rankQuickReplies(filtered, lastInboundMessage)
  }, [responses, selectedCategory, lastInboundMessage])

  const categories = useMemo(() => {
    const cats = [...new Set(responses.filter(r => r.isQuickReply).map(r => r.category))]
    return cats.filter(Boolean)
  }, [responses])

  const displayed = showAll ? quickReplies : quickReplies.slice(0, 5)

  function togglePanel() {
    setIsOpen(prev => {
      const next = !prev
      localStorage.setItem('quickRepliesPanelOpen', String(next))
      return next
    })
  }

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Toggle header */}
      <button
        onClick={togglePanel}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Zap className="w-4 h-4 text-yellow-500" />
          Quick Replies
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
      </button>

      {isOpen && (
        <div className="pb-2">
          {/* Category tabs */}
          {categories.length > 0 && (
            <div className="flex gap-1 px-4 pb-2 overflow-x-auto">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                  !selectedCategory ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                All
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                    selectedCategory === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Quick reply items */}
          {displayed.map(response => (
            <div
              key={response.id}
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 group"
            >
              <button
                onClick={() => onInsert(response.body)}
                className="flex-1 text-left text-sm text-gray-700 truncate"
              >
                {response.body.slice(0, 80)}{response.body.length > 80 ? '...' : ''}
              </button>
              <button
                onClick={() => {
                  onSend(response.body)
                  useCannedResponseStore.getState().recordUsage(response.id)
                }}
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors opacity-0 group-hover:opacity-100"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          ))}

          {quickReplies.length === 0 && (
            <p className="px-4 py-2 text-xs text-gray-400">No quick replies configured.</p>
          )}

          {quickReplies.length > 5 && (
            <button
              onClick={() => setShowAll(s => !s)}
              className="w-full py-2 text-xs text-gray-500 hover:text-gray-700 font-medium border-t border-gray-100"
            >
              {showAll ? 'Show less' : `Show more (${quickReplies.length - 5})`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
