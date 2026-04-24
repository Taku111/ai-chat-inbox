'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Zap, Bot, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CannedResponsePicker } from './CannedResponsePicker'
import toast from 'react-hot-toast'

interface MessageInputProps {
  conversationId: string
  aiModeEnabled: boolean
  initialValue?: string
  onSend: (body: string) => Promise<void>
  onAfterSend?: () => void
  onRequestAISuggestion?: () => void
  onToggleQuickReplies?: () => void
}

const MAX_ROWS = 5
const MAX_FILE_BYTES = 16 * 1024 * 1024 // 16MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/ogg', 'video/mp4', 'application/pdf']

export function MessageInput({
  conversationId,
  aiModeEnabled,
  initialValue = '',
  onSend,
  onAfterSend,
  onRequestAISuggestion,
  onToggleQuickReplies,
}: MessageInputProps) {
  const [value, setValue] = useState(initialValue)
  const [sending, setSending] = useState(false)
  const [showCannedPicker, setShowCannedPicker] = useState(false)
  const [cannedQuery, setCannedQuery] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Update value when initialValue changes (AI suggestion edit)
  useEffect(() => {
    if (initialValue) {
      setValue(initialValue)
      textareaRef.current?.focus()
    }
  }, [initialValue])

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    const lineHeight = parseInt(getComputedStyle(ta).lineHeight, 10) || 20
    const maxHeight = lineHeight * MAX_ROWS
    ta.style.height = Math.min(ta.scrollHeight, maxHeight) + 'px'
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value
    setValue(v)

    // Canned response picker: show when input starts with /
    if (v.startsWith('/')) {
      setShowCannedPicker(true)
      setCannedQuery(v.slice(1))
    } else {
      setShowCannedPicker(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Desktop: Enter sends, Shift+Enter newline
    // Mobile: Enter = newline (handled by textarea default)
    const isMobile = window.innerWidth < 768
    if (!isMobile && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function handleSend(override?: string) {
    const body = (override ?? value).trim()
    if (!body || sending) return

    setSending(true)
    // Clear input immediately (before await — optimistic UX)
    setValue('')
    setShowCannedPicker(false)

    try {
      await onSend(body)
      onAfterSend?.()
    } catch {
      setValue(body) // Restore on failure
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  function handleCannedSelect(body: string) {
    setValue(body)
    setShowCannedPicker(false)
    textareaRef.current?.focus()
  }

  function handleCannedSend(body: string) {
    setValue('')
    setShowCannedPicker(false)
    handleSend(body)
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_BYTES) {
      toast.error(`File too large (max 16MB)`)
      return
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error('Unsupported file type')
      return
    }
    // TODO: implement file upload to Firebase Storage + send with mediaUrl
    toast('File upload coming soon', { icon: 'ℹ️' })
    e.target.value = ''
  }

  if (aiModeEnabled) {
    return (
      <div className="border-t border-gray-200 px-4 py-3 bg-indigo-50 text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-indigo-600">
          <Bot className="w-4 h-4" />
          AI mode is active — AI will reply automatically
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-gray-200 bg-white relative">
      {showCannedPicker && (
        <CannedResponsePicker
          query={cannedQuery}
          onSelect={handleCannedSelect}
          onSend={handleCannedSend}
          onClose={() => setShowCannedPicker(false)}
        />
      )}

      <div className="flex items-end gap-2 px-3 py-2">
        {/* Left actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggleQuickReplies}
            className="p-2 text-gray-400 hover:text-yellow-500 rounded-lg hover:bg-gray-100 transition-colors"
            title="Quick Replies"
          >
            <Zap className="w-4 h-4" />
          </button>
          <label className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <Paperclip className="w-4 h-4" />
            <input type="file" className="hidden" onChange={handleFileSelect} accept={ALLOWED_MIME.join(',')} />
          </label>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={sending}
          className="flex-1 resize-none bg-gray-100 rounded-2xl px-3.5 py-2 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-colors disabled:opacity-60"
          style={{ fontSize: '16px', maxHeight: `${MAX_ROWS * 24}px` }}
        />

        {/* Right actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onRequestAISuggestion}
            className="p-2 text-gray-400 hover:text-indigo-500 rounded-lg hover:bg-gray-100 transition-colors"
            title="Request AI suggestion"
          >
            <Bot className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleSend()}
            disabled={!value.trim() || sending}
            className="p-2 bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
