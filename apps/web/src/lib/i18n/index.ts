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
  key: string,
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

/**
 * "{count} товаров" is wrong for 1 and 2–4 in Russian, and English needs
 * "1 item". `countLabel` picks the right form per locale so callers can stay
 * one line: countLabel(3, locale, 'products').
 */
const COUNT_FORMS: Record<'products' | 'items', Record<Locale, [string, string, string]>> = {
  products: {
    ru: ['товар', 'товара', 'товаров'],
    uz: ['mahsulot', 'mahsulot', 'mahsulot'],
    en: ['product', 'products', 'products'],
  },
  items: {
    ru: ['товар', 'товара', 'товаров'],
    uz: ['ta mahsulot', 'ta mahsulot', 'ta mahsulot'],
    en: ['item', 'items', 'items'],
  },
};

export function countLabel(count: number, locale: Locale, noun: keyof typeof COUNT_FORMS): string {
  const forms = COUNT_FORMS[noun][locale];
  let form: string;
  if (locale === 'ru') {
    const n10 = count % 10;
    const n100 = count % 100;
    if (n10 === 1 && n100 !== 11) form = forms[0];
    else if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) form = forms[1];
    else form = forms[2];
  } else {
    form = count === 1 ? forms[0] : forms[1];
  }
  return `${count} ${form}`;
}
