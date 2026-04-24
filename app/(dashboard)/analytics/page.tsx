'use client'

import { useState, useEffect } from 'react'
import { BarChart2, MessageSquare, Bot, Clock, CheckCircle } from 'lucide-react'

interface Metrics {
  totalConversations: number
  openConversations: number
  resolvedConversations: number
  totalMessages: number
  aiSuggestions: number
  aiAutoReplies: number
  avgResponseTimeHours: number | null
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(data => {
        if (data.ok) setMetrics(data.metrics)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-bold text-gray-900">Analytics</h1>
        <p className="text-xs text-gray-500">Last 30 days · Updates every 5 minutes</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : metrics ? (
          <div className="grid grid-cols-2 gap-3">
            <MetricCard icon={MessageSquare} label="Total Conversations" value={metrics.totalConversations} color="blue" />
            <MetricCard icon={CheckCircle} label="Resolved" value={metrics.resolvedConversations} color="green" />
            <MetricCard icon={MessageSquare} label="Open" value={metrics.openConversations} color="yellow" />
            <MetricCard icon={MessageSquare} label="Total Messages" value={metrics.totalMessages} color="purple" />
            <MetricCard icon={Bot} label="AI Suggestions" value={metrics.aiSuggestions} color="indigo" />
            <MetricCard icon={Bot} label="AI Auto-Replies" value={metrics.aiAutoReplies} color="indigo" />
            {metrics.avgResponseTimeHours !== null && (
              <MetricCard
                icon={Clock}
                label="Avg Response Time"
                value={`${metrics.avgResponseTimeHours.toFixed(1)}h`}
                color="orange"
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center p-8">Failed to load analytics</p>
        )}
      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType, label: string, value: number | string, color: string
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-8 h-8 rounded-lg ${colorMap[color]} flex items-center justify-center mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
