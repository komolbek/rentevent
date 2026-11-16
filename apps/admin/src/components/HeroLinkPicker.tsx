'use client'

import { useEffect, useState } from 'react'
import { adminCategoriesApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n/useTranslation'
import { CUSTOM_LINK, PRESET_LINKS, categoryLink, optionForUrl, type CategoryOption } from '@/lib/hero-link'

/**
 * Select for the hero button link: fixed pages, one option per category, or a
 * custom path/URL. Value is the plain cta_url string; empty = no link.
 */
export function HeroLinkPicker({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (next: string) => void
  className: string
}) {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loadFailed, setLoadFailed] = useState(false)
  const [forceCustom, setForceCustom] = useState(false)

  useEffect(() => {
    let alive = true
    adminCategoriesApi
      .list()
      .then(({ data }) => {
        if (!alive) return
        const list = (data?.data?.items || data?.data || []) as CategoryOption[]
        setCategories(list.map((c) => ({ id: c.id, name: c.name })))
      })
      .catch(() => alive && setLoadFailed(true))
    return () => {
      alive = false
    }
  }, [])

  const matched = optionForUrl(value, categories)
  const selected = forceCustom || loadFailed ? CUSTOM_LINK : matched
  const showInput = selected === CUSTOM_LINK

  return (
    <div>
      <select
        value={selected}
        disabled={loadFailed}
        onChange={(e) => {
          const v = e.target.value
          if (v === CUSTOM_LINK) {
            setForceCustom(true)
            return
          }
          setForceCustom(false)
          onChange(v)
        }}
        className={className}
      >
        <option value="">{t('hero.link_none')}</option>
        {PRESET_LINKS.map((p) => (
          <option key={p.value} value={p.value}>{t(p.labelKey)}</option>
        ))}
        {categories.length > 0 && (
          <optgroup label={t('hero.link_categories')}>
            {categories.map((c) => (
              <option key={c.id} value={categoryLink(c.id)}>{c.name}</option>
            ))}
          </optgroup>
        )}
        <option value={CUSTOM_LINK}>{t('hero.link_custom')}</option>
      </select>
      {loadFailed && <p className="mt-1 text-xs text-amber-700">{t('hero.link_categories_failed')}</p>}
      {showInput && (
        <input
          type="text"
          placeholder="/catalog"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${className} mt-2`}
        />
      )}
      {value.trim() !== '' && <p className="mt-1 text-xs text-gray-500 break-all">{value}</p>}
    </div>
  )
}
