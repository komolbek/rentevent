'use client';

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Search, Save, Percent, Eraser, RotateCcw, ImageIcon, CalendarDays } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminEventsApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n/useTranslation'

interface PriceEvent {
  id: string
  title: string
  image_url: string | null
  start_date: string
  end_date: string | null
}

interface PriceRow {
  product_id: string
  product_name: string
  photo: string | null
  category_id: string
  category_name: string
  is_active: boolean
  daily_price: number
  event_daily_price: number | null
}

// Format number with thousands separator (space), same as the product form
const formatThousands = (value: string): string => {
  const num = value.replace(/\D/g, '')
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const formatPrice = (price: number) => {
  if (price == null || Number.isNaN(Number(price))) return '—'
  return new Intl.NumberFormat('ru-RU').format(price) + ' сум'
}

function fmtDate(d: string | null) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

/** Draft input → price; empty means "use the normal price". */
const parseDraft = (v: string): number | null => {
  const digits = v.replace(/\D/g, '')
  return digits ? parseInt(digits, 10) : null
}

const toDraft = (v: number | null) => (v == null ? '' : String(v))

function errorMessage(err: unknown): string | undefined {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  return Array.isArray(msg) ? msg.join(', ') : msg
}

export default function EventPricesPage() {
  const params = useParams<{ id: string }>()
  const eventId = params.id
  const { t } = useTranslation()

  const [event, setEvent] = useState<PriceEvent | null>(null)
  const [rows, setRows] = useState<PriceRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [onlyOverridden, setOnlyOverridden] = useState(false)
  const [percent, setPercent] = useState('')

  const applyResponse = (data: { event: PriceEvent; items: PriceRow[] }) => {
    setEvent(data.event)
    setRows(data.items)
    setDrafts(Object.fromEntries(data.items.map((r) => [r.product_id, toDraft(r.event_daily_price)])))
  }

  useEffect(() => {
    if (!eventId) return
    const load = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const { data } = await adminEventsApi.getPrices(eventId)
        if (data.success) applyResponse(data.data)
      } catch (err) {
        console.error('Failed to fetch event prices:', err)
        setLoadError(errorMessage(err) || t('common.network_error'))
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const changed = useMemo(
    () => rows.filter((r) => parseDraft(drafts[r.product_id] ?? '') !== r.event_daily_price),
    [rows, drafts],
  )
  const dirty = changed.length > 0

  // Warn before leaving the page with unsaved edits.
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const categories = useMemo(() => {
    const seen = new Map<string, string>()
    for (const r of rows) if (!seen.has(r.category_id)) seen.set(r.category_id, r.category_name)
    return Array.from(seen, ([id, name]) => ({ id, name }))
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (categoryFilter && r.category_id !== categoryFilter) return false
      if (q && !r.product_name.toLowerCase().includes(q)) return false
      if (onlyOverridden && parseDraft(drafts[r.product_id] ?? '') == null) return false
      return true
    })
  }, [rows, search, categoryFilter, onlyOverridden, drafts])

  // Group the filtered rows by category, keeping the API's order.
  const groups = useMemo(() => {
    const out: { id: string; name: string; rows: PriceRow[] }[] = []
    for (const r of filtered) {
      const last = out[out.length - 1]
      if (last && last.id === r.category_id) last.rows.push(r)
      else out.push({ id: r.category_id, name: r.category_name, rows: [r] })
    }
    return out
  }, [filtered])

  const overriddenCount = useMemo(
    () => rows.filter((r) => parseDraft(drafts[r.product_id] ?? '') != null).length,
    [rows, drafts],
  )

  const percentValue = (() => {
    const v = parseFloat(percent.replace(',', '.'))
    return Number.isFinite(v) ? v : null
  })()

  const applyPercent = () => {
    if (percentValue == null || filtered.length === 0) return
    setDrafts((prev) => {
      const next = { ...prev }
      for (const r of filtered) {
        const price = Math.max(0, Math.round((r.daily_price * (1 + percentValue / 100)) / 1000) * 1000)
        next[r.product_id] = String(price)
      }
      return next
    })
    toast.success(t('prices.applied_percent', { count: filtered.length }))
  }

  const clearFiltered = () => {
    if (filtered.length === 0) return
    setDrafts((prev) => {
      const next = { ...prev }
      for (const r of filtered) next[r.product_id] = ''
      return next
    })
  }

  const resetChanges = () => {
    setDrafts(Object.fromEntries(rows.map((r) => [r.product_id, toDraft(r.event_daily_price)])))
  }

  const handleSave = async () => {
    if (!dirty) return
    setSaving(true)
    try {
      const prices = changed.map((r) => ({
        product_id: r.product_id,
        daily_price: parseDraft(drafts[r.product_id] ?? ''),
      }))
      const { data } = await adminEventsApi.setPrices(eventId, { prices })
      if (data.success) {
        applyResponse(data.data)
        toast.success(t('prices.saved', { count: prices.length }))
      } else {
        toast.error(data.message || t('common.save_error'))
      }
    } catch (err) {
      console.error('Failed to save event prices:', err)
      toast.error(errorMessage(err) || t('common.network_error'))
    } finally {
      setSaving(false)
    }
  }

  const diffBadge = (normal: number, eventPrice: number | null) => {
    if (eventPrice == null || !normal) return <span className="text-gray-300">—</span>
    const diff = ((eventPrice - normal) / normal) * 100
    const rounded = Math.round(diff * 10) / 10
    if (rounded === 0) return <span className="text-xs text-gray-500">0%</span>
    const up = rounded > 0
    return (
      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${up ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
        {up ? '+' : '−'}
        {Math.abs(rounded).toLocaleString('ru-RU')}%
      </span>
    )
  }

  return (
    <>
      <Link
        href="/admin/events"
        onClick={(e) => {
          if (dirty && !window.confirm(t('prices.leave_confirm'))) e.preventDefault()
        }}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('prices.back')}
      </Link>

      <div className="mb-6 flex items-center gap-4">
        {event?.image_url ? (
          <img src={event.image_url} alt={event.title} className="h-14 w-24 rounded-lg border border-gray-200 bg-white object-contain p-1" />
        ) : (
          <div className="h-14 w-24 rounded-lg bg-blue-50 flex items-center justify-center">
            <CalendarDays className="h-6 w-6 text-blue-400" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{t('prices.title')}{event ? ` — ${event.title}` : ''}</h1>
          {event && (
            <p className="text-sm text-gray-500">
              {fmtDate(event.start_date)}
              {event.end_date ? ` – ${fmtDate(event.end_date)}` : ''}
            </p>
          )}
        </div>
      </div>

      <p className="mb-4 text-gray-600">{t('prices.subtitle')}</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : loadError ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{loadError}</div>
      ) : (
        <>
          {/* Filters + bulk tools */}
          <div className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('prices.search_placeholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('common.all_categories')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
                <input type="checkbox" checked={onlyOverridden} onChange={(e) => setOnlyOverridden(e.target.checked)} className="h-4 w-4 text-blue-600 rounded" />
                {t('prices.only_overridden')}
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <span className="text-sm text-gray-600">{t('prices.bulk_label', { count: filtered.length })}</span>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value.replace(/[^0-9.,\-+]/g, ''))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPercent() } }}
                  placeholder="+20"
                  aria-label={t('prices.percent_label')}
                  className="w-24 px-3 py-1.5 pr-7 border border-gray-300 rounded-lg text-sm"
                />
                <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              </div>
              <button
                type="button"
                onClick={applyPercent}
                disabled={percentValue == null || filtered.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {t('prices.apply_percent')}
              </button>
              <button
                type="button"
                onClick={clearFiltered}
                disabled={filtered.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Eraser className="h-4 w-4" />
                {t('prices.clear_filtered')}
              </button>
              <span className="text-xs text-gray-500">{t('prices.percent_hint')}</span>
            </div>
          </div>

          {/* Sticky save bar */}
          <div className={`sticky top-0 z-10 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${dirty ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
            <div className="text-sm">
              {dirty ? (
                <span className="font-medium text-amber-800">{t('prices.unsaved', { count: changed.length })}</span>
              ) : (
                <span className="text-gray-500">{t('prices.overridden_total', { count: overriddenCount, total: rows.length })}</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetChanges}
                disabled={!dirty || saving}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                {t('prices.reset')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!dirty || saving}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-500">{t('prices.empty')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('prices.col_product')}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('prices.col_normal')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('prices.col_event')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('prices.col_diff')}</th>
                    </tr>
                  </thead>
                  {groups.map((g) => (
                    <tbody key={g.id} className="divide-y divide-gray-200 border-t border-gray-200">
                      <tr className="bg-gray-50/70">
                        <td colSpan={4} className="px-6 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                          {g.name} <span className="font-normal text-gray-400">· {g.rows.length}</span>
                        </td>
                      </tr>
                      {g.rows.map((r) => {
                        const draft = drafts[r.product_id] ?? ''
                        const draftValue = parseDraft(draft)
                        const isChanged = draftValue !== r.event_daily_price
                        return (
                          <tr key={r.product_id} className={isChanged ? 'bg-amber-50/60' : 'hover:bg-gray-50'}>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-3">
                                {r.photo ? (
                                  <img src={r.photo} alt={r.product_name} className="h-10 w-10 shrink-0 rounded object-cover" />
                                ) : (
                                  <div className="h-10 w-10 shrink-0 rounded bg-gray-100 flex items-center justify-center">
                                    <ImageIcon className="h-4 w-4 text-gray-400" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-medium truncate max-w-[320px]">{r.product_name}</div>
                                  {!r.is_active && <div className="text-xs text-gray-400">{t('prices.inactive')}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-right text-sm text-gray-700">{formatPrice(r.daily_price)}</td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="relative w-40">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={formatThousands(draft)}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '')
                                    setDrafts((prev) => ({ ...prev, [r.product_id]: raw }))
                                  }}
                                  placeholder={formatThousands(String(r.daily_price))}
                                  aria-label={t('prices.col_event')}
                                  className={`w-full px-3 py-1.5 pr-12 border rounded-lg text-sm ${isChanged ? 'border-amber-400' : 'border-gray-300'}`}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">сум</span>
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">{diffBadge(r.daily_price, draftValue)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  ))}
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
