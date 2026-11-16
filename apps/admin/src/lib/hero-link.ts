/**
 * Link picker model for the hero slide button (`cta_url`).
 * Pure helpers: map a saved URL to a picker option and back.
 */
export const CUSTOM_LINK = 'custom'

export interface PresetLink {
  /** Option value, also the saved cta_url. */
  value: string
  labelKey: string
}

export const PRESET_LINKS: PresetLink[] = [
  { value: '/catalog', labelKey: 'hero.link_catalog' },
  { value: '/catalog?sort=popular', labelKey: 'hero.link_popular' },
  { value: '/events', labelKey: 'hero.link_events' },
]

export interface CategoryOption {
  id: string
  name: string
}

export function categoryLink(id: string): string {
  return `/catalog?category=${encodeURIComponent(id)}`
}

/** Option values known for the current category list (presets + categories). */
export function knownLinks(categories: CategoryOption[]): Set<string> {
  return new Set([...PRESET_LINKS.map((p) => p.value), ...categories.map((c) => categoryLink(c.id))])
}

/**
 * Select value for a saved cta_url: the exact matching option, `''` for empty
 * (nothing chosen), otherwise CUSTOM_LINK.
 */
export function optionForUrl(url: string | null | undefined, categories: CategoryOption[]): string {
  const v = (url ?? '').trim()
  if (!v) return ''
  return knownLinks(categories).has(v) ? v : CUSTOM_LINK
}
