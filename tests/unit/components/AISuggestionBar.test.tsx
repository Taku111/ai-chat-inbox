/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('@/lib/firebase/client', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(() => () => {}), // Returns unsubscribe fn
}))

import { AISuggestionBar } from '@/components/chat/AISuggestionBar'
import { onSnapshot } from 'firebase/firestore'

const baseProps = {
  conversationId: 'conv-1',
  onSend: jest.fn(),
  onEditSuggestion: jest.fn(),
  onRegenerate: jest.fn(),
  conversation: null,
}

function makeConversation(overrides = {}) {
  return {
    id: 'conv-1',
    lastAiSuggestionMessageId: 'msg-1',
    ...overrides,
  } as any
}

function makeMessage(overrides = {}) {
  return {
    id: 'msg-1',
    aiSuggestionPending: false,
    aiSuggestion: null,
    ...overrides,
  }
}

describe('AISuggestionBar', () => {
  afterEach(() => jest.clearAllMocks())

  it('renders nothing when no lastAiSuggestionMessageId', () => {
    const { container } = render(
      <AISuggestionBar {...baseProps} conversation={{ ...makeConversation(), lastAiSuggestionMessageId: null }} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows shimmer when aiSuggestionPending=true and no suggestion', () => {
    ;(onSnapshot as jest.Mock).mockImplementationOnce((_, cb) => {
      cb({ exists: () => true, id: 'msg-1', data: () => makeMessage({ aiSuggestionPending: true }) })
      return () => {}
    })

    render(<AISuggestionBar {...baseProps} conversation={makeConversation()} />)
    expect(screen.getByText(/preparing/i)).toBeInTheDocument()
  })

  it('shows full suggestion when suggestion is fresh', () => {
    const freshSuggestion = {
      body: 'Fees are due Friday',
      quickOptions: ['Yes', 'No'],
      vendor: 'claude',
      model: 'claude-haiku',
      generatedAt: { toDate: () => new Date(), toMillis: () => Date.now() },
      approved: false, approvedBy: null, approvedAt: null,
    }
    ;(onSnapshot as jest.Mock).mockImplementationOnce((_, cb) => {
      cb({ exists: () => true, id: 'msg-1', data: () => makeMessage({ aiSuggestion: freshSuggestion }) })
      return () => {}
    })

    render(<AISuggestionBar {...baseProps} conversation={makeConversation()} />)
    expect(screen.getByText('Fees are due Friday')).toBeInTheDocument()
  })

  it('shows quick option buttons', () => {
    const freshSuggestion = {
      body: 'Fees are due Friday',
      quickOptions: ['Yes, Friday', 'Pay via EcoCash'],
      vendor: 'claude', model: 'claude-haiku',
      generatedAt: { toDate: () => new Date(), toMillis: () => Date.now() },
      approved: false, approvedBy: null, approvedAt: null,
    }
    ;(onSnapshot as jest.Mock).mockImplementationOnce((_, cb) => {
      cb({ exists: () => true, id: 'msg-1', data: () => makeMessage({ aiSuggestion: freshSuggestion }) })
      return () => {}
    })

    render(<AISuggestionBar {...baseProps} conversation={makeConversation()} />)
    expect(screen.getByText(/Yes, Friday/i)).toBeInTheDocument()
    expect(screen.getByText(/EcoCash/i)).toBeInTheDocument()
  })

  it('[Send] button calls onSend with full suggestion body', () => {
    const onSend = jest.fn()
    const freshSuggestion = {
      body: 'Please pay fees',
      quickOptions: [],
      vendor: 'claude', model: 'haiku',
      generatedAt: { toDate: () => new Date(), toMillis: () => Date.now() },
      approved: false, approvedBy: null, approvedAt: null,
    }
    ;(onSnapshot as jest.Mock).mockImplementationOnce((_, cb) => {
      cb({ exists: () => true, id: 'msg-1', data: () => makeMessage({ aiSuggestion: freshSuggestion }) })
      return () => {}
    })

    render(<AISuggestionBar {...{ ...baseProps, onSend }} conversation={makeConversation()} />)
    fireEvent.click(screen.getByRole('button', { name: /Send/i }))
    expect(onSend).toHaveBeenCalledWith('Please pay fees')
  })

  it('[Edit] button calls onEditSuggestion with body', () => {
    const onEdit = jest.fn()
    const freshSuggestion = {
      body: 'Edit this reply',
      quickOptions: [],
      vendor: 'claude', model: 'haiku',
      generatedAt: { toDate: () => new Date(), toMillis: () => Date.now() },
      approved: false, approvedBy: null, approvedAt: null,
    }
    ;(onSnapshot as jest.Mock).mockImplementationOnce((_, cb) => {
      cb({ exists: () => true, id: 'msg-1', data: () => makeMessage({ aiSuggestion: freshSuggestion }) })
      return () => {}
    })

    render(<AISuggestionBar {...{ ...baseProps, onEditSuggestion: onEdit }} conversation={makeConversation()} />)
    fireEvent.click(screen.getByRole('button', { name: /Edit/i }))
    expect(onEdit).toHaveBeenCalledWith('Edit this reply')
  })

  it('[Regenerate] button calls onRegenerate', () => {
    const onRegen = jest.fn()
    const freshSuggestion = {
      body: 'Regenerate me',
      quickOptions: [],
      vendor: 'claude', model: 'haiku',
      generatedAt: { toDate: () => new Date(), toMillis: () => Date.now() },
      approved: false, approvedBy: null, approvedAt: null,
    }
    ;(onSnapshot as jest.Mock).mockImplementationOnce((_, cb) => {
      cb({ exists: () => true, id: 'msg-1', data: () => makeMessage({ aiSuggestion: freshSuggestion }) })
      return () => {}
    })

    render(<AISuggestionBar {...{ ...baseProps, onRegenerate: onRegen }} conversation={makeConversation()} />)
    fireEvent.click(screen.getByRole('button', { name: /Regenerate/i }))
    expect(onRegen).toHaveBeenCalled()
  })

  it('shows stale banner when suggestion > 2 hours old', () => {
    const staleSuggestion = {
      body: 'Old suggestion',
      quickOptions: [],
      vendor: 'claude', model: 'haiku',
      generatedAt: {
        toDate: () => new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        toMillis: () => Date.now() - 3 * 60 * 60 * 1000,
      },
      approved: false, approvedBy: null, approvedAt: null,
    }
    ;(onSnapshot as jest.Mock).mockImplementationOnce((_, cb) => {
      cb({ exists: () => true, id: 'msg-1', data: () => makeMessage({ aiSuggestion: staleSuggestion }) })
      return () => {}
    })

    render(<AISuggestionBar {...baseProps} conversation={makeConversation()} />)
    expect(screen.getByText(/outdated/i)).toBeInTheDocument()
  })
})
