'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { useCurrentAgent } from '@/lib/hooks/useCurrentAgent'
import type { KnowledgeBaseEntry } from '@/types/ai'
import { BookOpen, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import toast from 'react-hot-toast'

export default function KnowledgeBasePage() {
  const { agent } = useCurrentAgent()
  const isAdmin = agent?.role === 'admin'
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [editEntry, setEditEntry] = useState<Partial<KnowledgeBaseEntry> | null>(null)
  const [saving, setSaving] = useState(false)

  async function loadEntries() {
    const snap = await getDocs(query(collection(db, COLLECTIONS.KNOWLEDGE_BASE), orderBy('priority'), orderBy('title')))
    setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as KnowledgeBaseEntry)))
    setLoading(false)
  }

  useEffect(() => { loadEntries() }, [])

  async function handleSave() {
    if (!editEntry) return
    setSaving(true)
    try {
      if (editEntry.id) {
        await updateDoc(doc(db, COLLECTIONS.KNOWLEDGE_BASE, editEntry.id), {
          ...editEntry,
          updatedAt: serverTimestamp(),
        })
        toast.success('Entry updated')
      } else {
        await addDoc(collection(db, COLLECTIONS.KNOWLEDGE_BASE), {
          ...editEntry,
          createdBy: agent?.uid ?? '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          schemaVersion: 1,
        })
        toast.success('Entry created')
      }
      await loadEntries()
      setEditEntry(null)
    } catch {
      toast.error('Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(entry: KnowledgeBaseEntry) {
    await updateDoc(doc(db, COLLECTIONS.KNOWLEDGE_BASE, entry.id), { isActive: !entry.isActive, updatedAt: serverTimestamp() })
    await loadEntries()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this entry?')) return
    await deleteDoc(doc(db, COLLECTIONS.KNOWLEDGE_BASE, id))
    await loadEntries()
    toast.success('Entry deleted')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-xs text-gray-500">AI uses this to answer parent questions</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setEditEntry({ title: '', content: '', category: 'General', priority: 3, isActive: true })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg font-medium"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState icon={BookOpen} title="No knowledge base entries" description="Add entries to help the AI answer parent questions accurately." />
        ) : (
          entries.map(entry => (
            <div key={entry.id} className={`bg-white rounded-xl border p-4 ${!entry.isActive ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{entry.category}</span>
                    <span className="text-xs text-gray-400">Priority {entry.priority}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">{entry.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-3">{entry.content}</p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleToggle(entry)} className="p-1.5 text-gray-400 hover:text-gray-600">
                      {entry.isActive ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setEditEntry(entry)} className="p-1.5 text-gray-400 hover:text-gray-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit drawer */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold">{editEntry.id ? 'Edit Entry' : 'New Entry'}</h3>
              <button onClick={() => setEditEntry(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <input
                value={editEntry.title ?? ''}
                onChange={e => setEditEntry(p => ({ ...p, title: e.target.value }))}
                placeholder="Title"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <div className="flex gap-2">
                <input
                  value={editEntry.category ?? ''}
                  onChange={e => setEditEntry(p => ({ ...p, category: e.target.value }))}
                  placeholder="Category"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
                <select
                  value={editEntry.priority ?? 3}
                  onChange={e => setEditEntry(p => ({ ...p, priority: Number(e.target.value) }))}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value={1}>P1 (Highest)</option>
                  <option value={2}>P2</option>
                  <option value={3}>P3</option>
                  <option value={4}>P4</option>
                  <option value={5}>P5 (Lowest)</option>
                </select>
              </div>
              <textarea
                value={editEntry.content ?? ''}
                onChange={e => setEditEntry(p => ({ ...p, content: e.target.value }))}
                placeholder="Content (max 500 chars recommended)"
                rows={6}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
              />
              <p className="text-xs text-gray-400 text-right">{(editEntry.content ?? '').length} chars</p>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditEntry(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-700">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
