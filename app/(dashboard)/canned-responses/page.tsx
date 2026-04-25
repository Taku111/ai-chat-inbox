'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  query,
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase/client'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { useCannedResponseStore } from '@/lib/stores/cannedResponseStore'
import { useCurrentAgent } from '@/lib/hooks/useCurrentAgent'
import type { CannedResponse } from '@/types/ai'
import { Zap, Plus, Edit2, Trash2, X } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const CATEGORIES = ['All', 'Fees', 'Admissions', 'Schedule', 'General']

export default function CannedResponsesPage() {
  const { agent } = useCurrentAgent()
  const { responses, fetch: fetchResponses } = useCannedResponseStore()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [editResponse, setEditResponse] = useState<Partial<CannedResponse> | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchResponses()
  }, [fetchResponses])

  const filtered = responses
    .filter((r) => selectedCategory === 'All' || r.category === selectedCategory)
    .sort((a, b) => b.usageCount - a.usageCount)

  async function handleSave() {
    if (!editResponse || !agent) return
    setSaving(true)
    try {
      const shortcode = (editResponse.shortcode ?? '')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/^\//, '')
      if (editResponse.id) {
        await updateDoc(doc(getDb(), COLLECTIONS.CANNED_RESPONSES, editResponse.id), {
          ...editResponse,
          shortcode,
          updatedBy: agent.uid,
          updatedAt: serverTimestamp(),
        })
        toast.success('Response updated')
      } else {
        await addDoc(collection(getDb(), COLLECTIONS.CANNED_RESPONSES), {
          ...editResponse,
          shortcode,
          usageCount: 0,
          lastUsedAt: null,
          createdBy: agent.uid,
          updatedBy: agent.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          schemaVersion: 1,
        })
        toast.success('Response created')
      }
      await fetchResponses()
      setEditResponse(null)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this response?')) return
    await deleteDoc(doc(getDb(), COLLECTIONS.CANNED_RESPONSES, id))
    await fetchResponses()
    toast.success('Deleted')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-gray-900">Canned Responses & Quick Replies</h1>
          <button
            onClick={() =>
              setEditResponse({
                title: '',
                shortcode: '',
                body: '',
                category: 'General',
                tags: [],
                isQuickReply: false,
                quickReplyOrder: 10,
              })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg font-medium"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                selectedCategory === cat
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No canned responses"
            description="Create responses for frequently asked questions."
          />
        ) : (
          filtered.map((r) => (
            <div key={r.id} className="px-4 py-3 hover:bg-gray-50">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {r.isQuickReply && (
                      <Zap className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                    )}
                    <span className="font-mono text-xs text-green-700 font-medium">
                      /{r.shortcode}
                    </span>
                    <span className="text-xs font-medium text-gray-700">{r.title}</span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{r.body}</p>
                  <p className="text-xs text-gray-400 mt-1">Used {r.usageCount} times</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditResponse(r)}
                    className="p-1.5 text-gray-400 hover:text-gray-600"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="p-1.5 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {editResponse && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">
                {editResponse.id ? 'Edit Response' : 'New Response'}
              </h3>
              <button onClick={() => setEditResponse(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={editResponse.title ?? ''}
                onChange={(e) => setEditResponse((p) => ({ ...p, title: e.target.value }))}
                placeholder="Title"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <div className="flex gap-2">
                <div className="flex items-center flex-1 border border-gray-200 rounded-lg overflow-hidden">
                  <span className="px-3 py-2 bg-gray-50 text-sm text-gray-500">/</span>
                  <input
                    value={editResponse.shortcode ?? ''}
                    onChange={(e) => setEditResponse((p) => ({ ...p, shortcode: e.target.value }))}
                    placeholder="shortcode"
                    className="flex-1 px-2 py-2 text-sm focus:outline-none"
                  />
                </div>
                <select
                  value={editResponse.category ?? 'General'}
                  onChange={(e) => setEditResponse((p) => ({ ...p, category: e.target.value }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <input
                value={(editResponse.tags ?? []).join(', ')}
                onChange={(e) =>
                  setEditResponse((p) => ({
                    ...p,
                    tags: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="Tags (comma separated: fees, payment, deadline)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <textarea
                value={editResponse.body ?? ''}
                onChange={(e) => setEditResponse((p) => ({ ...p, body: e.target.value }))}
                placeholder="Message body..."
                rows={5}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
              />
              <p className="text-xs text-gray-400 text-right">
                {(editResponse.body ?? '').length}/1000
              </p>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">⚡ Show as Quick Reply</p>
                  <p className="text-xs text-gray-500">Appear in the Quick Replies panel</p>
                </div>
                <button
                  onClick={() => setEditResponse((p) => ({ ...p, isQuickReply: !p?.isQuickReply }))}
                  className={cn(
                    'w-10 h-6 rounded-full transition-colors',
                    editResponse.isQuickReply ? 'bg-green-500' : 'bg-gray-300'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 bg-white rounded-full shadow mx-1 transition-transform',
                      editResponse.isQuickReply ? 'translate-x-4' : ''
                    )}
                  />
                </button>
              </div>
              {editResponse.isQuickReply && (
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700">Order in panel:</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editResponse.quickReplyOrder ?? 10}
                    onChange={(e) =>
                      setEditResponse((p) => ({ ...p, quickReplyOrder: Number(e.target.value) }))
                    }
                    className="w-20 px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setEditResponse(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
