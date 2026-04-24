'use client'

import { useState, useEffect, useRef } from 'react'
import { useCannedResponseStore } from '@/lib/stores/cannedResponseStore'
import { Pin, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface CannedResponsePickerProps {
  query: string
  onSelect: (body: string) => void
  onSend: (body: string) => void
  onClose: () => void
}

export function CannedResponsePicker({ query, onSelect, onSend, onClose }: CannedResponsePickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const { getByShortcode } = useCannedResponseStore()

  const results = getByShortcode(query)

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, results.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault()
        onSelect(results[selectedIndex].body)
      }
      if (e.key === 'Tab' && results[selectedIndex]) {
        e.preventDefault()
        onSend(results[selectedIndex].body)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [results, selectedIndex, onSelect, onSend, onClose])

  return (
    <div className="absolute bottom-full left-0 right-0 bg-white border border-gray-200 rounded-t-xl shadow-lg max-h-72 overflow-y-auto z-30">
      <div ref={listRef}>
        {results.length === 0 ? (
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">No responses match</span>
            <Link href="/canned-responses" className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" />
              Create one
            </Link>
          </div>
        ) : (
          <>
            {results.map((r, i) => (
              <button
                key={r.id}
                onClick={() => onSelect(r.body)}
                className={cn(
                  'w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0',
                  i === selectedIndex && 'bg-green-50'
                )}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  {r.usageCount > 10 && <Pin className="w-3 h-3 text-green-500" />}
                  <span className="text-xs font-mono font-medium text-green-700">/{r.shortcode}</span>
                  <span className="text-xs text-gray-500">{r.title}</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{r.body}</p>
              </button>
            ))}
            <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400">
              ↑↓ navigate · Enter to insert · Tab to send directly
            </div>
          </>
        )}
      </div>
    </div>
  )
}
