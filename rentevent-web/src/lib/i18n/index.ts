import ru from './locales/ru';
import en from './locales/en';
import uz from './locales/uz';
import type { TranslationKey } from './locales/ru';

export type Locale = 'ru' | 'en' | 'uz';

const translations: Record<Locale, Record<string, string>> = {
  ru,
  en,
  uz,
};

/**
 * Translate a key to the current locale, with optional interpolation.
 * Usage: t('cart.items_count', { count: 3 }) => "Товары (3)"
 */
export function t(
  key: TranslationKey,
  params?: Record<string, string | number>,
  locale: Locale = 'ru'
): string {
  let value = translations[locale]?.[key] || translations.ru[key] || key;

  if (params) {
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      value = value.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    });
  }

  return value;
}

export type { TranslationKey };
export { translations };
