import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IUser } from '@rentevent/types';

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  const stored = localStorage.getItem('device_id');
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem('device_id', id);
  return id;
}

interface AuthState {
  token: string | null;
  user: IUser | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;

  login: (token: string, user: IUser) => void;
  setAuth: (token: string, user: IUser) => void;
  setUser: (user: IUser) => void;
  logout: () => void;
}

// Sync auth token to cookie so Next.js middleware (server-side) can see it.
// The cookie mirrors the localStorage token; both are cleared on logout.
function setAuthCookie(token: string | null) {
  if (typeof document === 'undefined') return;
  if (token) {
    // 30 days, site-wide, SameSite=Lax so it's sent on same-site navigations
    document.cookie = `auth-token=${token}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
  } else {
    document.cookie = 'auth-token=; path=/; max-age=0; SameSite=Lax';
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,

      login: (token, user) => {
        setAuthCookie(token);
        set({ token, user, isAuthenticated: true });
      },

      setAuth: (token, user) => {
        setAuthCookie(token);
        set({ token, user, isAuthenticated: true });
      },

      setUser: (user) => set({ user }),

      logout: () => {
        setAuthCookie(null);
        set({ token: null, user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // After rehydrating from localStorage, ensure the cookie mirrors the token
        // (handles the case where the user logged in before this change shipped,
        // or the cookie expired while the localStorage entry is still valid).
        if (state?.token) {
          setAuthCookie(state.token);
        }
        useAuthStore.setState({ _hasHydrated: true });
      },
    },
  ),
);
