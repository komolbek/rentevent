import { useCallback } from 'react';
import { t as translate, type TranslationKey } from './index';
import { useLanguageStore } from '@/stores/languageStore';

export function useTranslation() {
  const { locale } = useLanguageStore();

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      return translate(key, params, locale);
    },
    [locale]
  );

  return { t, locale };
}
