'use client'

import { useState, useEffect } from 'react'
import { useCurrentAgent } from '@/lib/hooks/useCurrentAgent'
import { UserCheck, Plus, Trash2, Shield, User, Eye } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'
import type { Agent } from '@/types/agent'
import toast from 'react-hot-toast'

export default function AgentsPage() {
  const { agent: currentAgent } = useCurrentAgent()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteForm, setInviteForm] = useState<{ email: string; displayName: string; role: string } | null>(null)
  const [saving, setSaving] = useState(false)

  async function loadAgents() {
    const res = await fetch('/api/agents')
    if (res.ok) {
      const data = await res.json()
      setAgents(data.agents ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { loadAgents() }, [])

  if (currentAgent?.role !== 'admin') {
    return <div className="p-8 text-sm text-gray-500">Admin access required.</div>
  }

  async function handleInvite() {
    if (!inviteForm) return
    setSaving(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      toast.success('Agent invited successfully')
      if (data.passwordResetLink) {
        console.log('Password reset link:', data.passwordResetLink)
      }
      await loadAgents()
      setInviteForm(null)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to invite agent')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(uid: string) {
    if (!confirm('Deactivate this agent? They will be logged out immediately.')) return
    const res = await fetch(`/api/agents/${uid}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.ok) {
      toast.success('Agent deactivated')
      await loadAgents()
    } else {
      toast.error(data.error ?? 'Failed')
    }
  }

  const roleIcon = { admin: Shield, agent: User, viewer: Eye }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Agents</h1>
        <button
          onClick={() => setInviteForm({ email: '', displayName: '', role: 'agent' })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg font-medium"
        >
          <Plus className="w-4 h-4" />
          Invite
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : agents.length === 0 ? (
          <EmptyState icon={UserCheck} title="No agents" description="Invite agents to manage the inbox." />
        ) : (
          agents.map(a => {
            const Icon = roleIcon[a.role] ?? User
            return (
              <div key={a.uid} className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                  {a.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{a.displayName}</p>
                    {!a.isActive && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Inactive</span>}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Icon className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-500 capitalize">{a.role}</p>
                    <span className="text-gray-300">·</span>
                    <p className="text-xs text-gray-500 truncate">{a.email}</p>
                  </div>
                </div>
                {a.uid !== currentAgent?.uid && a.isActive && (
                  <button onClick={() => handleDeactivate(a.uid)} className="p-1.5 text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {inviteForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold mb-4">Invite Agent</h3>
            <div className="space-y-3">
              <input value={inviteForm.email} onChange={e => setInviteForm(p => p ? { ...p, email: e.target.value } : null)} placeholder="Email address" type="email" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input value={inviteForm.displayName} onChange={e => setInviteForm(p => p ? { ...p, displayName: e.target.value } : null)} placeholder="Display name" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <select value={inviteForm.role} onChange={e => setInviteForm(p => p ? { ...p, role: e.target.value } : null)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer (read-only)</option>
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setInviteForm(null)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm">Cancel</button>
              <button onClick={handleInvite} disabled={saving} className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">
                {saving ? 'Inviting...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
