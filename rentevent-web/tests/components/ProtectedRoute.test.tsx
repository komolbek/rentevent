import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

// Mock cartStore to prevent errors from authStore dependency
vi.mock('@/stores/cartStore', () => ({
  useCartStore: {
    getState: () => ({ clearCart: vi.fn() }),
  },
}))

vi.mock('@/lib/api', () => ({
  authApi: { logout: vi.fn() },
  userApi: { getProfile: vi.fn(), updateProfile: vi.fn() },
}))

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

function renderWithRouter(
  initialRoute: string,
  isAuthenticated: boolean,
  token: string | null
) {
  // Set the auth store state before rendering
  useAuthStore.setState({
    isAuthenticated,
    token,
    user: isAuthenticated
      ? { id: 'u1', phone_number: '+998901234567', name: 'Test', created_at: '' }
      : null,
  })

  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div data-testid="protected-content">Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/auth" element={<div data-testid="auth-page">Auth Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  })

  it('should render children when user is authenticated', () => {
    renderWithRouter('/protected', true, 'valid-token')

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(screen.queryByTestId('auth-page')).not.toBeInTheDocument()
  })

  it('should redirect to /auth when user is not authenticated', () => {
    renderWithRouter('/protected', false, null)

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('auth-page')).toBeInTheDocument()
  })

  it('should render children when token exists even if isAuthenticated is false', () => {
    // Edge case: token exists but isAuthenticated hasn't been set yet
    useAuthStore.setState({
      isAuthenticated: false,
      token: 'some-token',
    })

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/auth" element={<div data-testid="auth-page">Auth</div>} />
        </Routes>
      </MemoryRouter>
    )

    // Should show protected content since token exists
    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('should redirect when both token and isAuthenticated are falsy', () => {
    useAuthStore.setState({
      isAuthenticated: false,
      token: null,
    })

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div data-testid="protected-content">Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/auth" element={<div data-testid="auth-page">Auth</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('auth-page')).toBeInTheDocument()
  })
})
