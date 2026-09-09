import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAuthStore, getDeviceId } from '@/stores/authStore'

// Mock the API module
vi.mock('@/lib/api', () => ({
  authApi: {
    logout: vi.fn().mockResolvedValue(undefined),
  },
  userApi: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
  },
}))

// Mock the cart store
vi.mock('@/stores/cartStore', () => ({
  useCartStore: {
    getState: () => ({
      clearCart: vi.fn(),
    }),
  },
}))

describe('authStore', () => {
  beforeEach(() => {
    // Reset the store state
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
    localStorage.clear()
  })

  describe('setUser', () => {
    it('should set user and mark as authenticated', () => {
      const user = {
        id: 'user-1',
        phone_number: '+998901234567',
        name: 'Test User',
        created_at: '2025-01-01',
      }

      useAuthStore.getState().setUser(user)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(user)
      expect(state.isAuthenticated).toBe(true)
    })

    it('should clear authentication when user is null', () => {
      useAuthStore.getState().setUser(null)

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('setToken', () => {
    it('should set token in state and localStorage', () => {
      useAuthStore.getState().setToken('my-token')

      expect(useAuthStore.getState().token).toBe('my-token')
      expect(useAuthStore.getState().isAuthenticated).toBe(true)
      expect(localStorage.getItem('auth_token')).toBe('my-token')
    })

    it('should clear token from state and localStorage when null', () => {
      localStorage.setItem('auth_token', 'existing-token')
      useAuthStore.getState().setToken(null)

      expect(useAuthStore.getState().token).toBeNull()
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
      expect(localStorage.getItem('auth_token')).toBeNull()
    })
  })

  describe('login', () => {
    it('should set token, user, and clear errors', () => {
      useAuthStore.setState({ error: 'some old error' })

      const user = {
        id: 'user-1',
        phone_number: '+998901234567',
        name: 'Test',
        created_at: '2025-01-01',
      }
      useAuthStore.getState().login('session-token', user)

      const state = useAuthStore.getState()
      expect(state.token).toBe('session-token')
      expect(state.user).toEqual(user)
      expect(state.isAuthenticated).toBe(true)
      expect(state.error).toBeNull()
      expect(localStorage.getItem('auth_token')).toBe('session-token')
    })
  })

  describe('logout', () => {
    it('should clear user, token, and localStorage', async () => {
      useAuthStore.setState({
        user: { id: 'u1', phone_number: '+998901234567', name: 'Test', created_at: '' },
        token: 'token-123',
        isAuthenticated: true,
      })
      localStorage.setItem('auth_token', 'token-123')

      await useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(localStorage.getItem('auth_token')).toBeNull()
    })

    it('should handle API errors gracefully during logout', async () => {
      const { authApi } = await import('@/lib/api')
      vi.mocked(authApi.logout).mockRejectedValueOnce(new Error('Network error'))

      useAuthStore.setState({
        user: { id: 'u1', phone_number: '+998901234567', name: 'Test', created_at: '' },
        token: 'token-123',
        isAuthenticated: true,
      })

      // Should not throw
      await useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('fetchProfile', () => {
    it('should fetch and set the user profile', async () => {
      const { userApi } = await import('@/lib/api')
      const mockUser = {
        id: 'user-1',
        phone_number: '+998901234567',
        name: 'Fetched User',
        created_at: '2025-01-01',
      }
      vi.mocked(userApi.getProfile).mockResolvedValueOnce(mockUser)

      useAuthStore.setState({ token: 'valid-token' })

      await useAuthStore.getState().fetchProfile()

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.isAuthenticated).toBe(true)
      expect(state.isLoading).toBe(false)
    })

    it('should not fetch profile if no token', async () => {
      const { userApi } = await import('@/lib/api')

      useAuthStore.setState({ token: null })

      await useAuthStore.getState().fetchProfile()

      expect(userApi.getProfile).not.toHaveBeenCalled()
    })

    it('should clear auth on 401 error', async () => {
      const { userApi } = await import('@/lib/api')
      const error = { response: { status: 401 } }
      vi.mocked(userApi.getProfile).mockRejectedValueOnce(error)

      useAuthStore.setState({ token: 'expired-token', isAuthenticated: true })

      await useAuthStore.getState().fetchProfile()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('clearError', () => {
    it('should clear the error state', () => {
      useAuthStore.setState({ error: 'Some error' })

      useAuthStore.getState().clearError()

      expect(useAuthStore.getState().error).toBeNull()
    })
  })
})

describe('getDeviceId', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should generate a device ID and persist it', () => {
    const deviceId = getDeviceId()

    expect(deviceId).toBeDefined()
    expect(deviceId.startsWith('web_')).toBe(true)
    expect(localStorage.getItem('device_id')).toBe(deviceId)
  })

  it('should return the same device ID on subsequent calls', () => {
    const first = getDeviceId()
    const second = getDeviceId()

    expect(first).toBe(second)
  })

  it('should return stored device ID if already exists', () => {
    localStorage.setItem('device_id', 'existing-device-id')

    const deviceId = getDeviceId()

    expect(deviceId).toBe('existing-device-id')
  })
})
