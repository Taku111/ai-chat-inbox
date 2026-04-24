'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { useCurrentAgent } from '@/lib/hooks/useCurrentAgent'
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus'
import { useCannedResponseStore } from '@/lib/stores/cannedResponseStore'
import { Wifi, WifiOff } from 'lucide-react'

export default function DashboardClient({
  children,
}: {
  children: React.ReactNode
}) {
  const { agent, loading } = useCurrentAgent()
  const router = useRouter()
  const isOnline = useOnlineStatus()
  const { fetch: fetchCannedResponses, shouldRefresh } = useCannedResponseStore()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !agent) {
      router.push('/login')
    }
  }, [agent, loading, router])

  // Preload canned responses on mount
  useEffect(() => {
    if (agent && shouldRefresh()) {
      fetchCannedResponses()
    }
  }, [agent, fetchCannedResponses, shouldRefresh])

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!agent) return null

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <Sidebar agent={agent} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Offline banner */}
        {!isOnline && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border-b border-yellow-200 text-sm text-yellow-800 z-10">
            <WifiOff className="w-4 h-4" />
            You are offline. Some features may not work.
          </div>
        )}

        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>

      <MobileNav />
    </div>
  )
}
