'use client'

import React from 'react'
import * as Sentry from '@sentry/nextjs'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  sentryId: string | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, sentryId: null }
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const sentryId = Sentry.captureException(error, {
      contexts: { react: { componentStack: info.componentStack } },
    })
    this.setState({ sentryId })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
        <h3 className="text-base font-semibold text-gray-900 mb-1">Something went wrong</h3>
        <p className="text-sm text-gray-500 mb-4">
          {process.env.NODE_ENV === 'development' && this.state.sentryId
            ? `Error ID: ${this.state.sentryId}`
            : 'An error occurred. Please try again.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Reload page
        </button>
      </div>
    )
  }
}
