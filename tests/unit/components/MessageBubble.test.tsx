/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MessageBubble } from '@/components/chat/MessageBubble'
import type { Message, OptimisticMessage } from '@/types/message'
import { Timestamp } from 'firebase/firestore'

// Mock firebase/firestore
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() }),
    now: () => ({ toDate: () => new Date(), toMillis: () => Date.now() }),
  },
}))

const makeMsg = (overrides: Partial<Message & OptimisticMessage>): Message => ({
  id: 'msg-1',
  conversationId: 'conv-1',
  direction: 'outbound',
  sender: 'agent',
  senderAgentId: 'agent-uid',
  senderName: 'Agent Smith',
  body: 'Hello parent',
  type: 'text',
  mediaUrl: null,
  mediaContentType: null,
  status: 'sent',
  twilioSid: 'SMtest',
  externalId: 'SMtest',
  idempotencyKey: 'key-1',
  aiSuggestion: null,
  aiSuggestionPending: false,
  isAiAutonomous: false,
  sentAt: { toDate: () => new Date('2024-01-01T10:00:00'), toMillis: () => new Date('2024-01-01T10:00:00').getTime() } as any,
  createdAt: { toDate: () => new Date(), toMillis: () => Date.now() } as any,
  schemaVersion: 1,
  ...overrides,
})

describe('MessageBubble', () => {
  it('renders message body', () => {
    render(<MessageBubble message={makeMsg({})} currentAgentUid="agent-uid" />)
    expect(screen.getByText('Hello parent')).toBeInTheDocument()
  })

  it('optimistic sending message shows clock icon (opacity reduced)', () => {
    const { container } = render(
      <MessageBubble
        message={makeMsg({ status: 'sending' }) as any}
        currentAgentUid="agent-uid"
      />
    )
    // The bubble div should have opacity style for sending
    const bubble = container.querySelector('[class*="opacity"]')
    expect(bubble).toBeInTheDocument()
  })

  it('failed message shows retry button', () => {
    const onRetry = jest.fn()
    render(
      <MessageBubble
        message={makeMsg({ status: 'failed' }) as any}
        currentAgentUid="agent-uid"
        onRetry={onRetry}
      />
    )
    const retryBtn = screen.getByText(/Failed.*tap to retry/i)
    expect(retryBtn).toBeInTheDocument()
    fireEvent.click(retryBtn)
    expect(onRetry).toHaveBeenCalled()
  })

  it('AI autonomous message shows Bot label', () => {
    render(
      <MessageBubble
        message={makeMsg({ sender: 'ai', isAiAutonomous: true })}
        currentAgentUid="agent-uid"
      />
    )
    expect(screen.getByText('AI')).toBeInTheDocument()
  })

  it('inbound message is left-aligned (justify-start)', () => {
    const { container } = render(
      <MessageBubble
        message={makeMsg({ direction: 'inbound', sender: 'contact', senderAgentId: null })}
        currentAgentUid="agent-uid"
      />
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('justify-start')
  })

  it('outbound message is right-aligned (justify-end)', () => {
    const { container } = render(
      <MessageBubble message={makeMsg({})} currentAgentUid="agent-uid" />
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('justify-end')
  })
})
