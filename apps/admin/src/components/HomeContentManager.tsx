'use client';

import { useEffect, useState } from 'react'
import { Plus, Edit, Trash2, GripVertical, Upload, X, ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal, btn } from '@/components/Modal'
import { adminHeroSlidesApi, adminInspirationsApi, adminUploadApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n/useTranslation'

/**
 * Shared list + editor for the admin-managed home page content: hero slides
 * and inspirations. Both are ordered, localized (ru base + _uz/_en) cards with
 * an image; each kind declares which text fields it carries.
 */
export type HomeContentKind = 'hero' | 'inspiration'

type Lang = 'ru' | 'uz' | 'en'
const LANGS: Lang[] = ['ru', 'uz', 'en']
const SUFFIX: Record<Lang, string> = { ru: '', uz: '_uz', en: '_en' }

interface TextField {
  name: string
  labelKey: string
  multiline?: boolean
}

interface KindConfig {
  api: typeof adminHeroSlidesApi
  titleKey: string
  subtitleKey: string
  addKey: string
  emptyKey: string
  newKey: string
  editKey: string
  deleteTitleKey: string
  imageHintKey: string
  textFields: TextField[]
  linkField: { name: string; labelKey: string; hintKey: string; placeholder: string }
  thumbClass: string
}

const CONFIG: Record<HomeContentKind, KindConfig> = {
  hero: {
    api: adminHeroSlidesApi,
    titleKey: 'hero.title',
    subtitleKey: 'hero.subtitle',
    addKey: 'hero.add',
    emptyKey: 'hero.empty',
    newKey: 'hero.modal_new',
    editKey: 'hero.modal_edit',
    deleteTitleKey: 'hero.delete_title',
    imageHintKey: 'hero.image_hint',
    textFields: [
      { name: 'title', labelKey: 'content.field_title' },
      { name: 'subtitle', labelKey: 'content.field_subtitle', multiline: true },
      { name: 'cta_label', labelKey: 'hero.field_cta_label' },
    ],
    linkField: {
      name: 'cta_url',
      labelKey: 'hero.field_cta_url',
      hintKey: 'hero.cta_url_hint',
      placeholder: '/catalog',
    },
    thumbClass: 'h-12 w-28',
  },
  inspiration: {
    api: adminInspirationsApi,
    titleKey: 'insp.title',
    subtitleKey: 'insp.subtitle',
    addKey: 'insp.add',
    emptyKey: 'insp.empty',
    newKey: 'insp.modal_new',
    editKey: 'insp.modal_edit',
    deleteTitleKey: 'insp.delete_title',
    imageHintKey: 'insp.image_hint',
    textFields: [
      { name: 'title', labelKey: 'content.field_title' },
      { name: 'description', labelKey: 'content.field_description', multiline: true },
    ],
    linkField: {
      name: 'link_url',
      labelKey: 'insp.field_link_url',
      hintKey: 'insp.link_url_hint',
      placeholder: '/catalog',
    },
    thumbClass: 'h-14 w-14',
  },
}

interface ContentItem {
  id: string
  image_url: string
  title: string
  is_active: boolean
  display_order: number
  created_at: string
  [key: string]: string | number | boolean | null
}

type FormState = Record<string, string> & { image_url: string }

function errorMessage(err: unknown): string | undefined {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  return Array.isArray(msg) ? msg.join(', ') : msg
}

export function HomeContentManager({ kind }: { kind: HomeContentKind }) {
  const cfg = CONFIG[kind]
  const { t } = useTranslation()

  const emptyForm = (): FormState => {
    const f: FormState = { image_url: '' }
    for (const field of cfg.textFields) for (const l of LANGS) f[`${field.name}${SUFFIX[l]}`] = ''
    f[cfg.linkField.name] = ''
    return f
  }

  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ContentItem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [isActive, setIsActive] = useState(true)
  const [lang, setLang] = useState<Lang>('ru')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<ContentItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const { data } = await cfg.api.list()
      if (data.success) setItems(data.data.items || data.data || [])
    } catch (err) {
      console.error(`Failed to fetch ${kind}:`, err)
      toast.error(t('common.network_error'))
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setIsActive(true)
    setLang('ru')
    setError(null)
    setShowModal(true)
  }

  const openEdit = (item: ContentItem) => {
    const f = emptyForm()
    for (const key of Object.keys(f)) {
      const v = item[key]
      f[key] = typeof v === 'string' ? v : ''
    }
    setEditing(item)
    setForm(f)
    setIsActive(item.is_active)
    setLang('ru')
    setError(null)
    setShowModal(true)
  }

  const handleImageUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { data } = await adminUploadApi.uploadImage(file)
      if (data.success && data.data?.url) setForm((p) => ({ ...p, image_url: data.data.url }))
    } catch (err) {
      console.error('Upload failed:', err)
      toast.error(t('common.upload_error'))
    } finally {
      setUploading(false)
      ev.target.value = ''
    }
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.image_url) {
      setError(t('content.err_image_required'))
      return
    }
    if (!form.title.trim()) {
      setLang('ru')
      setError(t('content.err_title_required'))
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body: Record<string, unknown> = { ...form, is_active: isActive }
      const { data } = editing
        ? await cfg.api.update(editing.id, body)
        : await cfg.api.create(body)
      if (data.success) {
        setShowModal(false)
        toast.success(t('common.saved'))
        fetchItems()
      } else {
        setError(data.message || t('common.save_error'))
      }
    } catch (err) {
      console.error(`Failed to save ${kind}:`, err)
      setError(errorMessage(err) || t('common.network_error'))
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (item: ContentItem) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active: !item.is_active } : i)))
    try {
      await cfg.api.update(item.id, { is_active: !item.is_active })
    } catch (err) {
      console.error(`Failed to toggle ${kind}:`, err)
      toast.error(t('common.save_error'))
      fetchItems()
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return
    setIsDeleting(true)
    try {
      const { data } = await cfg.api.delete(deleteConfirm.id)
      if (data.success) {
        setDeleteConfirm(null)
        toast.success(t('content.deleted'))
        fetchItems()
      }
    } catch (err) {
      console.error(`Failed to delete ${kind}:`, err)
      toast.error(errorMessage(err) || t('common.network_error'))
    } finally {
      setIsDeleting(false)
    }
  }

  const handleReorderDrop = async (targetIndex: number) => {
    const from = dragIndex
    setDragIndex(null)
    setDragOverIndex(null)
    if (from === null || from === targetIndex) return
    const reordered = [...items]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(targetIndex, 0, moved)
    setItems(reordered) // optimistic
    try {
      await cfg.api.reorder({ orderedIds: reordered.map((i) => i.id) })
    } catch (err) {
      console.error(`Failed to reorder ${kind}:`, err)
      toast.error(t('content.reorder_error'))
      fetchItems() // revert to server order on failure
    }
  }

  const field = 'w-full px-4 py-2 border border-gray-300 rounded-lg bg-white'
  const suffix = SUFFIX[lang]

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">{t(cfg.titleKey)}</h1>

      <div className="flex justify-between items-center mb-6 gap-4">
        <p className="text-gray-600">{t(cfg.subtitleKey)}</p>
        <button onClick={openCreate} className="flex shrink-0 items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-5 w-5 mr-2" />
          {t(cfg.addKey)}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{t(cfg.emptyKey)}</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10" />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('content.col_item')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((item, index) => {
                const secondary = kind === 'hero' ? item.subtitle : item.description
                const link = item[cfg.linkField.name]
                return (
                  <tr
                    key={item.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(ev) => { ev.preventDefault(); if (dragOverIndex !== index) setDragOverIndex(index) }}
                    onDrop={() => handleReorderDrop(index)}
                    onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
                    className={`hover:bg-gray-50 ${dragIndex === index ? 'opacity-40' : ''} ${dragOverIndex === index && dragIndex !== null && dragIndex !== index ? 'border-t-2 border-blue-500' : ''}`}
                  >
                    <td className="px-2">
                      <GripVertical className="h-5 w-5 text-gray-400 cursor-grab active:cursor-grabbing" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.title} className={`${cfg.thumbClass} shrink-0 rounded object-cover`} />
                        ) : (
                          <div className={`${cfg.thumbClass} shrink-0 rounded bg-gray-100 flex items-center justify-center`}>
                            <ImageIcon className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-medium truncate max-w-[360px]">{item.title}</div>
                          {secondary ? <div className="text-xs text-gray-500 truncate max-w-[360px]">{String(secondary)}</div> : null}
                          {link ? <div className="text-xs text-blue-600 truncate max-w-[360px]">{String(link)}</div> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleActive(item)}
                        className={`px-2 py-1 rounded text-sm ${item.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                      >
                        {item.is_active ? t('common.active') : t('common.hidden')}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => openEdit(item)} aria-label={t('common.edit')} title={t('common.edit')} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50">
                          <Edit className="h-5 w-5" />
                        </button>
                        <button type="button" onClick={() => setDeleteConfirm(item)} aria-label={t('common.delete')} title={t('common.delete')} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      {items.length > 1 && <p className="mt-3 text-xs text-gray-500">{t('content.reorder_hint')}</p>}

      {/* Create / edit modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? t(cfg.editKey) : t(cfg.newKey)}
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} disabled={saving} className={btn.secondary}>{t('common.cancel')}</button>
            <button type="submit" form={`${kind}-form`} disabled={saving || uploading} className={btn.primary}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </>
        }
      >
        <form id={`${kind}-form`} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('content.field_image')} *</label>
            {form.image_url ? (
              <div className="relative inline-block">
                <img
                  src={form.image_url}
                  alt=""
                  className={kind === 'hero' ? 'h-32 w-full max-w-md rounded-lg object-cover border' : 'h-32 w-32 rounded-lg object-cover border'}
                />
                <button type="button" onClick={() => setForm((p) => ({ ...p, image_url: '' }))} aria-label={t('common.delete')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null}
            <div className={form.image_url ? 'mt-2' : ''}>
              <label className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                {uploading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" /> : <Upload className="h-4 w-4" />}
                {form.image_url ? t('common.replace_photo') : t('common.upload_photo')}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">{t(cfg.imageHintKey)}</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            <div role="tablist" className="mb-3 inline-flex rounded-lg border border-gray-200 bg-white p-1">
              {LANGS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="tab"
                  aria-selected={lang === l}
                  onClick={() => setLang(l)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${lang === l ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {cfg.textFields.map((f) => {
                const key = `${f.name}${suffix}`
                const required = f.name === 'title' && lang === 'ru'
                return (
                  <div key={key}>
                    <label className="block text-sm text-gray-600 mb-1">
                      {t(f.labelKey)} ({lang.toUpperCase()}){required ? ' *' : ''}
                    </label>
                    {f.multiline ? (
                      <textarea rows={2} value={form[key] ?? ''} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className={field} />
                    ) : (
                      <input type="text" value={form[key] ?? ''} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} className={field} />
                    )}
                  </div>
                )
              })}
              {lang !== 'ru' && <p className="text-xs text-gray-500">{t('content.translation_hint')}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">{t(cfg.linkField.labelKey)}</label>
            <input
              type="text"
              placeholder={cfg.linkField.placeholder}
              value={form[cfg.linkField.name] ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, [cfg.linkField.name]: e.target.value }))}
              className={field}
            />
            <p className="mt-1 text-xs text-gray-500">{t(cfg.linkField.hintKey)}</p>
          </div>

          <div className="flex items-center">
            <input type="checkbox" id={`${kind}_active`} checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 text-blue-600 rounded" />
            <label htmlFor={`${kind}_active`} className="ml-2 text-sm">{t('content.active_label')}</label>
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title={t(cfg.deleteTitleKey)}
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setDeleteConfirm(null)} disabled={isDeleting} className={btn.secondary}>{t('common.cancel')}</button>
            <button type="button" onClick={handleConfirmDelete} disabled={isDeleting} className={btn.danger}>
              {isDeleting ? t('common.deleting') : t('common.delete')}
            </button>
          </>
        }
      >
        {deleteConfirm && (
          <p className="text-gray-600">
            {t('content.delete_confirm')} <strong>&quot;{deleteConfirm.title}&quot;</strong>?
          </p>
        )}
      </Modal>
    </>
  )
}
