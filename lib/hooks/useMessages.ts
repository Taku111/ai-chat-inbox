'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  collection,
  query,
  orderBy,
  limitToLast,
  onSnapshot,
  getDocs,
  endBefore,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { getDb } from '@/lib/firebase/client'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { Message, OptimisticMessage } from '@/types/message'
import * as Sentry from '@sentry/nextjs'
import { v4 as uuidv4 } from 'uuid'

const PAGE_SIZE = 30

export function useMessages(conversationId: string) {
  const [confirmedMessages, setConfirmedMessages] = useState<Message[]>([])
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [hasOlder, setHasOlder] = useState(false)
  const firstVisibleRef = useRef<QueryDocumentSnapshot | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!conversationId) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)

    const q = query(
      collection(getDb(), COLLECTIONS.MESSAGES(conversationId)),
      orderBy('sentAt', 'asc'),
      limitToLast(PAGE_SIZE)
    )

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Message)
        setConfirmedMessages(docs)
        firstVisibleRef.current = snapshot.docs[0] ?? null
        setHasOlder(snapshot.docs.length === PAGE_SIZE)

        // Remove optimistic messages that have been confirmed by Firestore
        setOptimisticMessages((prev) => prev.filter((opt) => !docs.some((c) => c.id === opt.id)))
        setLoading(false)
      },
      (err) => {
        setError(err)
        Sentry.captureException(err)
        setLoading(false)
      }
    )

    return unsub
  }, [conversationId])

  const loadOlder = useCallback(async () => {
    if (!firstVisibleRef.current || !hasOlder) return

    const container = scrollContainerRef.current
    const prevScrollHeight = container?.scrollHeight ?? 0

    try {
      const q = query(
        collection(getDb(), COLLECTIONS.MESSAGES(conversationId)),
        orderBy('sentAt', 'asc'),
        endBefore(firstVisibleRef.current),
        limitToLast(PAGE_SIZE)
      )
      const snapshot = await getDocs(q)
      const older = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Message)

      setConfirmedMessages((prev) => [...older, ...prev])
      firstVisibleRef.current = snapshot.docs[0] ?? null
      setHasOlder(snapshot.docs.length === PAGE_SIZE)

      // Preserve scroll position after inserting older messages at top
      if (container) {
        const newScrollHeight = container.scrollHeight
        container.scrollTop = newScrollHeight - prevScrollHeight
      }
    } catch (err) {
      Sentry.captureException(err)
    }
  }, [conversationId, hasOlder])

  const addOptimisticMessage = useCallback((msg: OptimisticMessage) => {
    setOptimisticMessages((prev) => [...prev, msg])
  }, [])

  const confirmMessage = useCallback((id: string) => {
    setOptimisticMessages((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const failMessage = useCallback((id: string) => {
    setOptimisticMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'failed' as const } : m))
    )
  }, [])

  // Rendered list = confirmed + optimistic (optimistic at end, ordered by sentAt)
  const messages: (Message | OptimisticMessage)[] = [...confirmedMessages, ...optimisticMessages]

  return {
    messages,
    confirmedMessages,
    optimisticMessages,
    loading,
    error,
    hasOlder,
    loadOlder,
    addOptimisticMessage,
    confirmMessage,
    failMessage,
    scrollContainerRef,
  }
}
