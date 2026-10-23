import type { Locale } from './index';

interface Localizable {
  name: string;
  nameUz?: string | null;
  nameEn?: string | null;
  description?: string | null;
  descriptionUz?: string | null;
  descriptionEn?: string | null;
}

/**
 * Pick a product's name in the active locale, falling back to the default
 * (Russian) value when a translation is empty. Also works for categories.
 */
export function localizedName(item: Localizable | undefined | null, locale: Locale): string {
  if (!item) return '';
  if (locale === 'uz') return item.nameUz?.trim() || item.name;
  if (locale === 'en') return item.nameEn?.trim() || item.name;
  return item.name;
}

export function localizedDescription(
  item: Localizable | undefined | null,
  locale: Locale,
): string | null {
  if (!item) return null;
  if (locale === 'uz') return item.descriptionUz?.trim() || item.description || null;
  if (locale === 'en') return item.descriptionEn?.trim() || item.description || null;
  return item.description ?? null;
}

/**
 * Admin-managed snake_case content (hero slides, inspirations, events):
 * `field` is the Russian base, `field_uz` / `field_en` the translations.
 */
export function localizedField<K extends string>(
  row: { [P in K | `${K}_uz` | `${K}_en`]?: string | null },
  field: K,
  locale: Locale,
): string {
  const base = (row[field] ?? '').trim();
  if (locale === 'ru') return base;
  const translated = (row[`${field}_${locale}` as `${K}_uz`] ?? '').trim();
  return translated || base;
}
