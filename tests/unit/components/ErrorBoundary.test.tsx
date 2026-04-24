/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn().mockReturnValue('test-sentry-id'),
}))

const Thrower = () => {
  throw new Error('Test render error')
}

describe('ErrorBoundary', () => {
  // Suppress console.error from React during throw tests
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <p>Safe content</p>
      </ErrorBoundary>
    )
    expect(screen.getByText('Safe content')).toBeInTheDocument()
  })

  it('renders fallback when child throws', () => {
    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    )
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument()
  })

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<p>Custom error UI</p>}>
        <Thrower />
      </ErrorBoundary>
    )
    expect(screen.getByText('Custom error UI')).toBeInTheDocument()
  })

  it('reports to Sentry on error', () => {
    const { captureException } = require('@sentry/nextjs')
    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    )
    expect(captureException).toHaveBeenCalled()
  })
})
