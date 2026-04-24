/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock Firebase auth
jest.mock('@/lib/firebase/client', () => ({ auth: {} }))
jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn(),
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}))

import LoginForm from '@/components/auth/LoginForm'
import { signInWithEmailAndPassword } from 'firebase/auth'

const mockSignIn = signInWithEmailAndPassword as jest.Mock

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('renders email and password fields', () => {
    render(<LoginForm />)
    expect(screen.getByPlaceholderText(/bexley/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/••••••••/)).toBeInTheDocument()
  })

  it('renders sign in button', () => {
    render(<LoginForm />)
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows loading state while submitting', async () => {
    mockSignIn.mockImplementation(() => new Promise(() => {})) // never resolves

    render(<LoginForm />)
    await userEvent.type(screen.getByPlaceholderText(/bexley/i), 'test@bexley.ac.zw')
    await userEvent.type(screen.getByPlaceholderText(/••••••••/), 'password123')
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/Signing in/i)).toBeInTheDocument()
    })
  })

  it('shows error on wrong credentials', async () => {
    const fbErr = Object.assign(new Error('Firebase: Error (auth/invalid-credential).'), { code: 'auth/invalid-credential' })
    mockSignIn.mockRejectedValue(fbErr)

    render(<LoginForm />)
    await userEvent.type(screen.getByPlaceholderText(/bexley/i), 'test@bexley.ac.zw')
    await userEvent.type(screen.getByPlaceholderText(/••••••••/), 'wrongpass')
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/Incorrect email or password/i)).toBeInTheDocument()
    })
  })

  it('shows cooldown after failed attempt', async () => {
    const fbErr = Object.assign(new Error('Firebase: Error (auth/invalid-credential).'), { code: 'auth/invalid-credential' })
    mockSignIn.mockRejectedValue(fbErr)

    render(<LoginForm />)
    await userEvent.type(screen.getByPlaceholderText(/bexley/i), 'test@bexley.ac.zw')
    await userEvent.type(screen.getByPlaceholderText(/••••••••/), 'wrongpass')
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/Please wait/i)).toBeInTheDocument()
    })
  })

  it('shows/hides password on toggle', async () => {
    render(<LoginForm />)
    const pwInput = screen.getByPlaceholderText(/••••••••/) as HTMLInputElement
    expect(pwInput.type).toBe('password')

    const toggleBtn = pwInput.parentElement?.querySelector('button')!
    fireEvent.click(toggleBtn)
    expect(pwInput.type).toBe('text')
  })

  it('shows unauthorised error when session API returns 403', async () => {
    mockSignIn.mockResolvedValue({ user: { getIdToken: () => Promise.resolve('fake-token') } })
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: 'Not an authorised agent' }) })

    render(<LoginForm />)
    await userEvent.type(screen.getByPlaceholderText(/bexley/i), 'test@bexley.ac.zw')
    await userEvent.type(screen.getByPlaceholderText(/••••••••/), 'password123')
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/not authorised/i)).toBeInTheDocument()
    })
  })
})
