'use client'

import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/client'
import { COLLECTIONS } from '@/lib/firebase/collections'
import type { Agent } from '@/types/agent'

export function useCurrentAgent() {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, user => {
      if (!user) {
        setAgent(null)
        setLoading(false)
        return
      }

      const unsubAgent = onSnapshot(
        doc(db, COLLECTIONS.AGENTS, user.uid),
        snapshot => {
          if (snapshot.exists()) {
            setAgent({ uid: snapshot.id, ...snapshot.data() } as Agent)
          } else {
            setAgent(null)
          }
          setLoading(false)
        },
        () => {
          setLoading(false)
        }
      )

      return unsubAgent
    })

    return unsubAuth
  }, [])

  return { agent, loading }
}
