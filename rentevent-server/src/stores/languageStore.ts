import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translations, type Locale, type TranslationKeys } from '@/lib/website/i18n';

interface LanguageState {
  locale: Locale;
  t: TranslationKeys;
  setLocale: (locale: Locale) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      locale: 'ru',
      t: translations.ru,

      setLocale: (locale) => {
        set({ locale, t: translations[locale] });
      },
    }),
    {
      name: 'language-storage',
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.t = translations[state.locale];
        }
      },
    }
  )
);
