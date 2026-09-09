import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { authApi, userApi } from '@/lib/api';
import { useCartStore } from './cartStore';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateProfile: (name: string) => Promise<void>;
  clearError: () => void;
}

// Generate or get device ID
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = `web_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setToken: (token) => {
        if (token) {
          localStorage.setItem('auth_token', token);
        } else {
          localStorage.removeItem('auth_token');
        }
        set({ token, isAuthenticated: !!token });
      },

      login: (token, user) => {
        localStorage.setItem('auth_token', token);
        set({ token, user, isAuthenticated: true, error: null });
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          localStorage.removeItem('auth_token');
          set({ user: null, token: null, isAuthenticated: false });
          useCartStore.getState().clearCart();
        }
      },

      fetchProfile: async () => {
        const { token } = get();
        if (!token) return;

        set({ isLoading: true, error: null });
        try {
          const user = await userApi.getProfile();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ isLoading: false, error: 'Failed to fetch profile' });
          // If profile fetch fails, clear auth
          if ((error as { response?: { status: number } }).response?.status === 401) {
            localStorage.removeItem('auth_token');
            set({ user: null, token: null, isAuthenticated: false });
          }
        }
      },

      updateProfile: async (name) => {
        set({ isLoading: true, error: null });
        try {
          const user = await userApi.updateProfile(name);
          set({ user, isLoading: false });
        } catch (error) {
          set({ isLoading: false, error: 'Failed to update profile' });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

export { getDeviceId };
