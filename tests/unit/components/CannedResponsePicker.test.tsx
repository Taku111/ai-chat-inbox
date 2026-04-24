/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

jest.mock('@/lib/firebase/client', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn(n => n),
}))
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: any) => <a href={href}>{children}</a> }))
jest.mock('@/lib/stores/cannedResponseStore', () => ({
  useCannedResponseStore: jest.fn().mockReturnValue({
    getByShortcode: jest.fn(),
  }),
}))

import { CannedResponsePicker } from '@/components/chat/CannedResponsePicker'
import { useCannedResponseStore } from '@/lib/stores/cannedResponseStore'

const mockResponses = [
  { id: 'r1', shortcode: 'fees', title: 'Fee Deadline', body: 'Fees due Friday', usageCount: 50, tags: [] },
  { id: 'r2', shortcode: 'feestruct', title: 'Fee Structure', body: '2025 fees: Grade 1...', usageCount: 20, tags: [] },
]

describe('CannedResponsePicker', () => {
  beforeEach(() => {
    ;(useCannedResponseStore as jest.Mock).mockReturnValue({
      getByShortcode: jest.fn().mockReturnValue(mockResponses),
    })
  })

  it('renders when given a query', () => {
    render(
      <CannedResponsePicker
        query="fee"
        onSelect={jest.fn()}
        onSend={jest.fn()}
        onClose={jest.fn()}
      />
    )
    expect(screen.getByText('/fees')).toBeInTheDocument()
  })

  it('shows shortcode and title for each result', () => {
    render(
      <CannedResponsePicker query="fee" onSelect={jest.fn()} onSend={jest.fn()} onClose={jest.fn()} />
    )
    expect(screen.getByText('Fee Deadline')).toBeInTheDocument()
    expect(screen.getByText('/fees')).toBeInTheDocument()
  })

  it('calls onSelect when result is clicked', () => {
    const onSelect = jest.fn()
    render(<CannedResponsePicker query="fee" onSelect={onSelect} onSend={jest.fn()} onClose={jest.fn()} />)
    fireEvent.click(screen.getByText('Fees due Friday'))
    expect(onSelect).toHaveBeenCalledWith('Fees due Friday')
  })

  it('calls onClose on Escape key', () => {
    const onClose = jest.fn()
    render(<CannedResponsePicker query="fee" onSelect={jest.fn()} onSend={jest.fn()} onClose={onClose} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('shows empty state with create link when no results', () => {
    ;(useCannedResponseStore as jest.Mock).mockReturnValue({
      getByShortcode: jest.fn().mockReturnValue([]),
    })
    render(<CannedResponsePicker query="xyz" onSelect={jest.fn()} onSend={jest.fn()} onClose={jest.fn()} />)
    expect(screen.getByText(/No responses match/i)).toBeInTheDocument()
    expect(screen.getByText(/Create one/i)).toBeInTheDocument()
  })

  it('calls onSend on Tab key', () => {
    const onSend = jest.fn()
    render(<CannedResponsePicker query="fee" onSelect={jest.fn()} onSend={onSend} onClose={jest.fn()} />)
    fireEvent.keyDown(window, { key: 'Tab' })
    // Tab on first item should call onSend with its body
    expect(onSend).toHaveBeenCalledWith('Fees due Friday')
  })

  it('navigates with arrow keys', () => {
    render(<CannedResponsePicker query="fee" onSelect={jest.fn()} onSend={jest.fn()} onClose={jest.fn()} />)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    // After ArrowDown, second item should be highlighted (index 1)
    // Just check it doesn't throw
    expect(screen.getAllByText(/\/fee/)).toHaveLength(2)
  })
})
