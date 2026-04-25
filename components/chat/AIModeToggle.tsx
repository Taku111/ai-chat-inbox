'use client'

import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getDb } from '@/lib/firebase/client'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAIModeStore } from '@/lib/stores/aiModeStore'
import toast from 'react-hot-toast'
import type { Conversation } from '@/types/conversation'
import type { Agent } from '@/types/agent'

interface AIModeToggleProps {
  conversation: Conversation
  agent: Agent
}

export function AIModeToggle({ conversation, agent }: AIModeToggleProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setMode } = useAIModeStore()

  const isEnabled = conversation.aiModeEnabled

  async function toggle(enabled: boolean) {
    setLoading(true)
    try {
      await updateDoc(doc(getDb(), COLLECTIONS.CONVERSATIONS, conversation.id), {
        aiModeEnabled: enabled,
        aiModeEnabledAt: enabled ? serverTimestamp() : null,
        aiModeEnabledBy: enabled ? agent.uid : null,
        updatedAt: serverTimestamp(),
      })
      setMode(conversation.id, enabled)
      toast.success(enabled ? 'AI mode enabled' : 'AI mode disabled')
    } catch {
      toast.error('Failed to update AI mode')
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <button
        onClick={() => {
          if (!isEnabled) setShowConfirm(true)
          else toggle(false)
        }}
        disabled={loading}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60',
          isEnabled
            ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        )}
        title={isEnabled ? 'AI mode ON — tap to disable' : 'Enable AI auto-reply mode'}
      >
        <Bot className="w-3.5 h-3.5" />
        {isEnabled ? 'AI ON' : 'AI OFF'}
      </button>

      {/* Confirmation sheet */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-gray-900 mb-2">Enable AI Mode?</h3>
            <p className="text-sm text-gray-600 mb-4">
              AI will automatically reply to this parent&apos;s messages without your review. Each
              reply is sent ~60 seconds after the parent goes quiet. You can disable it at any time.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => toggle(true)}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
              >
                Enable AI
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
