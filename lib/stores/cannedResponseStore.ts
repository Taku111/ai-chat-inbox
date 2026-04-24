import { create } from 'zustand'
import { collection, getDocs, doc, updateDoc, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { CannedResponse } from '@/types/ai'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

interface CannedResponseStore {
  responses: CannedResponse[]
  lastFetchedAt: number | null
  loading: boolean

  fetch(): Promise<void>
  shouldRefresh(): boolean
  getByShortcode(prefix: string): CannedResponse[]
  getQuickReplies(category?: string): CannedResponse[]
  getByKeywords(keywords: string[]): CannedResponse[]
  recordUsage(id: string): void
}

export const useCannedResponseStore = create<CannedResponseStore>((set, get) => ({
  responses: [],
  lastFetchedAt: null,
  loading: false,

  async fetch() {
    if (get().loading) return
    set({ loading: true })
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.CANNED_RESPONSES))
      const responses = snap.docs.map(d => ({ id: d.id, ...d.data() } as CannedResponse))
      set({ responses, lastFetchedAt: Date.now() })
    } finally {
      set({ loading: false })
    }
  },

  shouldRefresh() {
    const { lastFetchedAt } = get()
    return !lastFetchedAt || Date.now() - lastFetchedAt > REFRESH_INTERVAL_MS
  },

  getByShortcode(prefix: string) {
    const p = prefix.toLowerCase().replace(/^\//, '')
    return get().responses.filter(r =>
      r.shortcode.toLowerCase().startsWith(p)
    )
  },

  getQuickReplies(category?: string) {
    return get().responses.filter(r =>
      r.isQuickReply && (!category || r.category === category)
    ).sort((a, b) => a.quickReplyOrder - b.quickReplyOrder || b.usageCount - a.usageCount)
  },

  getByKeywords(keywords: string[]) {
    const lk = keywords.map(k => k.toLowerCase())
    return get().responses.filter(r =>
      r.tags.some(tag => lk.some(k => k.includes(tag.toLowerCase())))
    )
  },

  recordUsage(id: string) {
    set(state => ({
      responses: state.responses.map(r =>
        r.id === id ? { ...r, usageCount: r.usageCount + 1 } : r
      ),
    }))
    // Write to Firestore in background
    updateDoc(doc(db, COLLECTIONS.CANNED_RESPONSES, id), {
      usageCount: increment(1),
      lastUsedAt: new Date(),
    }).catch(() => {})
  },
}))
