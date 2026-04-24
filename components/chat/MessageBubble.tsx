'use client'

import { Clock, Check, CheckCheck, AlertCircle, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { Message, OptimisticMessage } from '@/types/message'

interface MessageBubbleProps {
  message: Message | OptimisticMessage
  currentAgentUid: string
  onRetry?: (message: OptimisticMessage) => void
}

export function MessageBubble({ message, currentAgentUid, onRetry }: MessageBubbleProps) {
  const isInbound = message.direction === 'inbound'
  const isOptimistic = message.status === 'sending' || message.status === 'failed'
  const isAI = message.sender === 'ai'
  const isOutbound = message.direction === 'outbound'

  const sentAt = message.sentAt
    ? (typeof (message.sentAt as any).toDate === 'function'
        ? (message.sentAt as any).toDate()
        : new Date(message.sentAt as any))
    : new Date()

  return (
    <div className={cn(
      'flex gap-2 px-4 py-1',
      isInbound ? 'justify-start' : 'justify-end'
    )}>
      {isInbound && (
        <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0 self-end mb-1">
          {(message.senderName || 'U').charAt(0).toUpperCase()}
        </div>
      )}

      <div className={cn('max-w-[75%] group')}>
        {/* Sender name for inbound */}
        {isInbound && (
          <p className="text-xs text-gray-500 mb-1 ml-1">{message.senderName}</p>
        )}

        <div className={cn(
          'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isInbound
            ? 'bg-gray-100 text-gray-900 rounded-tl-sm'
            : isAI
              ? 'bg-indigo-600 text-white rounded-tr-sm' // AI autonomous — distinct indigo
              : 'bg-green-500 text-white rounded-tr-sm',
          message.status === 'failed' && 'bg-red-100 text-red-900',
          isOptimistic && message.status === 'sending' && 'opacity-80',
        )}>
          {/* AI label */}
          {isAI && (
            <div className="flex items-center gap-1 mb-1 text-indigo-200 text-xs">
              <Bot className="w-3 h-3" />
              <span>AI</span>
            </div>
          )}

          {message.body}

          {/* Media */}
          {message.mediaUrl && message.type === 'image' && (
            <img
              src={message.mediaUrl}
              alt="Media"
              className="mt-2 rounded-lg max-w-full max-h-60 object-cover"
            />
          )}
        </div>

        {/* Timestamp + status */}
        <div className={cn(
          'flex items-center gap-1 mt-1 text-xs text-gray-400',
          isOutbound ? 'justify-end' : 'justify-start'
        )}>
          <span>{format(sentAt, 'HH:mm')}</span>

          {isOutbound && (
            <StatusIcon status={message.status} isAI={isAI} />
          )}
        </div>

        {/* Failed retry */}
        {message.status === 'failed' && onRetry && (
          <button
            onClick={() => onRetry(message as OptimisticMessage)}
            className="flex items-center gap-1 mt-1 text-xs text-red-600 hover:text-red-700 font-medium"
          >
            <AlertCircle className="w-3 h-3" />
            Failed — tap to retry
          </button>
        )}
      </div>
    </div>
  )
}

function StatusIcon({ status, isAI }: { status: string; isAI: boolean }) {
  if (status === 'sending') return <Clock className="w-3 h-3 text-gray-300" />
  if (status === 'failed') return <AlertCircle className="w-3 h-3 text-red-400" />
  if (status === 'sent') return <Check className="w-3 h-3 text-gray-400" />
  if (status === 'delivered') return <CheckCheck className="w-3 h-3 text-gray-400" />
  if (status === 'read') return <CheckCheck className={cn('w-3 h-3', isAI ? 'text-indigo-300' : 'text-green-300')} />
  return null
}
