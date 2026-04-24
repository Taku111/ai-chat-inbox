'use client'

import { ArrowLeft, MoreVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Conversation } from '@/types/conversation'

interface TopBarProps {
  title?: string
  subtitle?: string
  conversation?: Conversation
  showBack?: boolean
  actions?: React.ReactNode
}

export function TopBar({ title, subtitle, conversation, showBack, actions }: TopBarProps) {
  const router = useRouter()

  const displayTitle = conversation?.contactName ?? title ?? 'Bexley Inbox'
  const displaySub = conversation
    ? conversation.contactPhone
    : subtitle

  return (
    <header className="flex items-center gap-3 px-4 h-14 bg-white border-b border-gray-200 flex-shrink-0">
      {showBack && (
        <button
          onClick={() => router.back()}
          className="p-1.5 -ml-1 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-gray-900 truncate">{displayTitle}</h1>
        {displaySub && (
          <p className="text-xs text-gray-500 truncate">{displaySub}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {actions}
        </div>
      )}
    </header>
  )
}
