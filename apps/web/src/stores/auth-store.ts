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
      // Rehydration runs synchronously inside create(), so this cannot
      // reference useAuthStore (it is not initialised yet — the old
      // onRehydrateStorage callback threw here and zustand swallowed it,
      // which left _hasHydrated permanently false). merge() has everything
      // it needs without touching the store.
      merge: (persisted, current) => {
        const stored = (persisted as Partial<AuthState> | undefined) ?? {};
        // Ensure the cookie mirrors the token (handles a login that predates
        // the cookie, or a cookie that expired while localStorage is valid).
        if (stored.token) setAuthCookie(stored.token);
        return { ...current, ...stored, _hasHydrated: true };
      },
    },
  ),
);
