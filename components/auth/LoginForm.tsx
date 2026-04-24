'use client'

import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, MessageSquare } from 'lucide-react'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading || cooldown) return
    setLoading(true)
    setError(null)

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const idToken = await credential.user.getIdToken()

      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Authentication failed')
      }

      router.push('/conversations')
      router.refresh()
    } catch (err: unknown) {
      const msg = getErrorMessage(err)
      setError(msg)
      setCooldown(true)
      setTimeout(() => setCooldown(false), 5000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bexley Inbox</h1>
            <p className="text-sm text-gray-500">School WhatsApp Inbox</p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Sign in</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-60"
              style={{ fontSize: '16px' }} // Prevents iOS zoom
              placeholder="you@bexley.ac.zw"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-60"
                style={{ fontSize: '16px' }}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || cooldown}
            className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-base"
          >
            {loading ? 'Signing in...' : cooldown ? 'Please wait...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found') || msg.includes('auth/invalid-email')) {
      return 'Incorrect email or password. Please try again.'
    }
    if (msg.includes('Not an authorised agent')) {
      return 'Your account is not authorised to access this inbox. Contact your administrator.'
    }
    if (msg.includes('auth/too-many-requests')) {
      return 'Too many failed attempts. Please try again in a few minutes.'
    }
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('api-key-not-valid') || msg.includes('auth/configuration-not-found')) {
      return 'Network error. Please check your connection and try again.'
    }
    return msg
  }
  return 'An unexpected error occurred. Please try again.'
}
