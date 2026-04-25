'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { getAuth, getDb } from '@/lib/firebase/client'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { Agent } from '@/types/agent'

export function useCurrentAgent() {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubAgent: (() => void) | null = null

    const unsubAuth = onAuthStateChanged(getAuth(), (user) => {
      if (unsubAgent) {
        unsubAgent()
        unsubAgent = null
      }

      if (!user) {
        setAgent(null)
        setLoading(false)
        return
      }

      const agentRef = doc(getDb(), COLLECTIONS.AGENTS, user.uid)
      unsubAgent = onSnapshot(
        agentRef,
        (snap) => {
          if (snap.exists() && snap.data()?.isActive) {
            setAgent({ uid: snap.id, ...snap.data() } as Agent)
          } else {
            setAgent(null)
          }
          setLoading(false)
        },
        () => {
          setAgent(null)
          setLoading(false)
        }
      )
    })

    return () => {
      unsubAuth()
      if (unsubAgent) unsubAgent()
    }
  }, [])

  return { agent, loading }
}
