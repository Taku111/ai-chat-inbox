'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// AI settings are embedded in the main settings page — redirect there
export default function AISettingsPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/settings') }, [router])
  return null
}
