'use client'

import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getDb } from '@/lib/firebase/client'
import { COLLECTIONS } from '@/lib/firebase/collections'
import { useCurrentAgent } from '@/lib/hooks/useCurrentAgent'
import type { GlobalSettings } from '@/types/settings'
import { Settings } from 'lucide-react'
import toast from 'react-hot-toast'

const DEFAULT_SETTINGS: Partial<GlobalSettings> = {
  businessName: 'Bexley School',
  businessDescription: '',
  aiVendor: 'claude',
  aiModel: 'claude-haiku-4-5-20251001',
  aiSystemPrompt: '',
  aiDebounceSeconds: 60,
  autoReplyMaxPerHour: 10,
  autoResolveAfterDays: 0,
  defaultAssignment: null,
  businessHoursEnabled: false,
  businessHoursStart: '07:30',
  businessHoursEnd: '17:00',
  businessHoursTimezone: 'Africa/Harare',
  outOfHoursMessage:
    'Thank you for your message. Our office is currently closed. We will respond during business hours.',
}

export default function SettingsPage() {
  const { agent } = useCurrentAgent()
  const isAdmin = agent?.role === 'admin'
  const [settings, setSettings] = useState<Partial<GlobalSettings>>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getDoc(doc(getDb(), COLLECTIONS.SETTINGS, 'global'))
      .then((snap) => {
        if (snap.exists()) setSettings({ ...DEFAULT_SETTINGS, ...snap.data() })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!isAdmin || !agent) return
    setSaving(true)
    try {
      await setDoc(doc(getDb(), COLLECTIONS.SETTINGS, 'global'), {
        ...settings,
        id: 'global',
        updatedAt: serverTimestamp(),
        updatedBy: agent.uid,
        schemaVersion: 1,
      })
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return <div className="p-8 text-sm text-gray-500">Admin access required to edit settings.</div>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Settings</h1>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="px-4 py-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white text-sm rounded-lg font-medium"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <Section title="School Info">
            <Field label="School Name">
              <input
                value={settings.businessName ?? ''}
                onChange={(e) => setSettings((p) => ({ ...p, businessName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </Field>
            <Field label="Description">
              <textarea
                value={settings.businessDescription ?? ''}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, businessDescription: e.target.value }))
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </Field>
          </Section>

          <Section title="AI Configuration">
            <Field label="AI Vendor">
              <select
                value={settings.aiVendor ?? 'claude'}
                onChange={(e) => setSettings((p) => ({ ...p, aiVendor: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="claude">Claude (Anthropic)</option>
                <option value="openai">GPT (OpenAI)</option>
                <option value="gemini">Gemini (Google)</option>
              </select>
            </Field>
            <Field label="AI Model">
              <input
                value={settings.aiModel ?? ''}
                onChange={(e) => setSettings((p) => ({ ...p, aiModel: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="claude-haiku-4-5-20251001"
              />
            </Field>
            <Field label={`Debounce Window: ${settings.aiDebounceSeconds}s`}>
              <input
                type="range"
                min={10}
                max={300}
                step={10}
                value={settings.aiDebounceSeconds ?? 60}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, aiDebounceSeconds: Number(e.target.value) }))
                }
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                AI fires {settings.aiDebounceSeconds}s after the parent&apos;s last message. Min:
                10s, Max: 300s
              </p>
            </Field>
            <Field label="Max AI Replies Per Hour">
              <input
                type="number"
                min={1}
                max={60}
                value={settings.autoReplyMaxPerHour ?? 10}
                onChange={(e) =>
                  setSettings((p) => ({ ...p, autoReplyMaxPerHour: Number(e.target.value) }))
                }
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </Field>
            <Field label="Custom System Prompt">
              <textarea
                value={settings.aiSystemPrompt ?? ''}
                onChange={(e) => setSettings((p) => ({ ...p, aiSystemPrompt: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                placeholder="Additional instructions for the AI..."
              />
            </Field>
          </Section>

          <Section title="Business Hours">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Enable business hours</label>
              <button
                onClick={() =>
                  setSettings((p) => ({ ...p, businessHoursEnabled: !p.businessHoursEnabled }))
                }
                className={`w-10 h-6 rounded-full transition-colors ${settings.businessHoursEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow mx-1 transition-transform ${settings.businessHoursEnabled ? 'translate-x-4' : ''}`}
                />
              </button>
            </div>
            {settings.businessHoursEnabled && (
              <>
                <div className="flex gap-2">
                  <Field label="Start">
                    <input
                      type="time"
                      value={settings.businessHoursStart ?? '07:30'}
                      onChange={(e) =>
                        setSettings((p) => ({ ...p, businessHoursStart: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </Field>
                  <Field label="End">
                    <input
                      type="time"
                      value={settings.businessHoursEnd ?? '17:00'}
                      onChange={(e) =>
                        setSettings((p) => ({ ...p, businessHoursEnd: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </Field>
                </div>
                <Field label="Timezone">
                  <input
                    value={settings.businessHoursTimezone ?? 'Africa/Harare'}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, businessHoursTimezone: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Africa/Harare"
                  />
                </Field>
                <Field label="Out of hours message">
                  <textarea
                    value={settings.outOfHoursMessage ?? ''}
                    onChange={(e) =>
                      setSettings((p) => ({ ...p, outOfHoursMessage: e.target.value }))
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </Field>
              </>
            )}
          </Section>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-700 mb-3">{title}</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}
