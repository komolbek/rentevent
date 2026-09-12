import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme;
}

function applyTheme(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(resolved);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: (theme) => {
        const resolved = resolve(theme);
        applyTheme(resolved);
        set({ theme, resolvedTheme: resolved });
      },
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ theme: state.theme }),
      // Rehydration runs synchronously inside create(), before the exported
      // const exists — the old onRehydrateStorage callback referenced
      // useThemeStore there, threw (silently swallowed by zustand), and the
      // resolved theme never synced from storage: a dark-theme visitor saw
      // the Moon ("switch to dark") icon on a dark page. Deriving it in
      // merge() needs no reference to the store.
      merge: (persisted, current) => {
        const theme = (persisted as Partial<ThemeState> | undefined)?.theme;
        // Nothing stored = the visitor never chose: stay light, as the SSR
        // markup and the inline <head> script already do, so there is no
        // flash to dark for OS-dark visitors who never asked for it.
        if (!theme) return current;
        const resolved = resolve(theme);
        applyTheme(resolved);
        return { ...current, theme, resolvedTheme: resolved };
      },
    },
  ),
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme, setTheme } = useThemeStore.getState();
    if (theme === 'system') {
      setTheme('system');
    }
  });
}
