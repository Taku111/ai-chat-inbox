'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  startAfter,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { Conversation } from '@/types/conversation'
import * as Sentry from '@sentry/nextjs'

type TabType = 'open' | 'pending' | 'resolved' | 'all'

const PAGE_SIZE = 50

export function useConversations(tab: TabType = 'open') {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const lastVisibleRef = useRef<QueryDocumentSnapshot | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  const isLive = tab === 'open' || tab === 'pending'

  const buildQuery = useCallback(() => {
    const col = collection(db, COLLECTIONS.CONVERSATIONS)
    if (tab === 'open' || tab === 'pending') {
      return query(
        col,
        where('status', 'in', ['open', 'pending']),
        orderBy('lastMessageAt', 'desc'),
        limit(PAGE_SIZE)
      )
    }
    if (tab === 'resolved') {
      return query(
        col,
        where('status', '==', 'resolved'),
        orderBy('lastMessageAt', 'desc'),
        limit(PAGE_SIZE)
      )
    }
    return query(col, orderBy('lastMessageAt', 'desc'), limit(PAGE_SIZE))
  }, [tab])

  useEffect(() => {
    setLoading(true)
    setError(null)
    lastVisibleRef.current = null

    if (unsubRef.current) {
      unsubRef.current()
      unsubRef.current = null
    }

    if (isLive) {
      // Real-time listener for Open/Pending
      unsubRef.current = onSnapshot(
        buildQuery(),
        snapshot => {
          const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Conversation))
          setConversations(docs)
          setHasMore(snapshot.docs.length === PAGE_SIZE)
          lastVisibleRef.current = snapshot.docs[snapshot.docs.length - 1] ?? null
          setLoading(false)
        },
        err => {
          setError(err)
          Sentry.captureException(err)
          setLoading(false)
        }
      )
    } else {
      // One-time fetch for Resolved/All tabs
      getDocs(buildQuery())
        .then(snapshot => {
          const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Conversation))
          setConversations(docs)
          setHasMore(snapshot.docs.length === PAGE_SIZE)
          lastVisibleRef.current = snapshot.docs[snapshot.docs.length - 1] ?? null
          setLoading(false)
        })
        .catch(err => {
          setError(err)
          Sentry.captureException(err)
          setLoading(false)
        })
    }

    return () => {
      if (unsubRef.current) {
        unsubRef.current()
        unsubRef.current = null
      }
    }
  }, [tab, buildQuery, isLive])

  const loadMore = useCallback(async () => {
    if (!lastVisibleRef.current || !hasMore) return

    const col = collection(db, COLLECTIONS.CONVERSATIONS)
    let q
    if (tab === 'open' || tab === 'pending') {
      q = query(
        col,
        where('status', 'in', ['open', 'pending']),
        orderBy('lastMessageAt', 'desc'),
        startAfter(lastVisibleRef.current),
        limit(PAGE_SIZE)
      )
    } else if (tab === 'resolved') {
      q = query(
        col,
        where('status', '==', 'resolved'),
        orderBy('lastMessageAt', 'desc'),
        startAfter(lastVisibleRef.current),
        limit(PAGE_SIZE)
      )
    } else {
      q = query(col, orderBy('lastMessageAt', 'desc'), startAfter(lastVisibleRef.current), limit(PAGE_SIZE))
    }

    try {
      const snapshot = await getDocs(q)
      const more = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Conversation))
      setConversations(prev => [...prev, ...more])
      setHasMore(snapshot.docs.length === PAGE_SIZE)
      lastVisibleRef.current = snapshot.docs[snapshot.docs.length - 1] ?? null
    } catch (err) {
      Sentry.captureException(err)
    }
  }, [tab, hasMore])

  return { conversations, loading, error, loadMore, hasMore }
}
