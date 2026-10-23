'use client';

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2, GripVertical, Upload, X, CalendarDays, Tag } from 'lucide-react'
import { Modal, btn } from '@/components/Modal'
import { adminEventsApi, adminUploadApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n/useTranslation'

interface EventItem {
  id: string
  title: string
  title_uz: string | null
  title_en: string | null
  description: string | null
  description_uz: string | null
  description_en: string | null
  image_url: string | null
  venue: string | null
  city: string | null
  start_date: string
  end_date: string | null
  website_url: string | null
  is_active: boolean
  display_order: number
  event_prices_count?: number
}

const emptyForm = {
  title: '',
  title_uz: '',
  title_en: '',
  description: '',
  description_uz: '',
  description_en: '',
  image_url: '',
  venue: 'Central Asian Expo (CAEx)',
  city: 'Ташкент',
  start_date: '',
  end_date: '',
  website_url: '',
  is_active: true,
}

function fmtDate(d: string | null) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

export default function EventsPage() {
  const { t } = useTranslation()
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<EventItem | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<EventItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const { data } = await adminEventsApi.list()
      if (data.success) setEvents(data.data.items || data.data || [])
    } catch (err) {
      console.error('Failed to fetch events:', err)
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
    setShowModal(true)
  }

  const openEdit = (e: EventItem) => {
    setEditing(e)
    setForm({
      title: e.title,
      title_uz: e.title_uz || '',
      title_en: e.title_en || '',
      description: e.description || '',
      description_uz: e.description_uz || '',
      description_en: e.description_en || '',
      image_url: e.image_url || '',
      venue: e.venue || '',
      city: e.city || '',
      start_date: e.start_date ? e.start_date.slice(0, 10) : '',
      end_date: e.end_date ? e.end_date.slice(0, 10) : '',
      website_url: e.website_url || '',
      is_active: e.is_active,
    })
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
      alert('Ошибка загрузки изображения')
    } finally {
      setUploading(false)
      ev.target.value = ''
    }
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        ...form,
        image_url: form.image_url || null,
        end_date: form.end_date || null,
        website_url: form.website_url || null,
      }
      const { data } = editing
        ? await adminEventsApi.update(editing.id, body)
        : await adminEventsApi.create(body)
      if (data.success) {
        setShowModal(false)
        fetchEvents()
      } else {
        setError(data.message || 'Ошибка при сохранении')
      }
    } catch (err) {
      console.error('Failed to save event:', err)
      setError('Ошибка сети. Проверьте подключение.')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return
    setIsDeleting(true)
    try {
      const { data } = await adminEventsApi.delete(deleteConfirm.id)
      if (data.success) {
        setDeleteConfirm(null)
        fetchEvents()
      }
    } catch (err) {
      console.error('Failed to delete event:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleReorderDrop = async (targetIndex: number) => {
    const from = dragIndex
    setDragIndex(null)
    setDragOverIndex(null)
    if (from === null || from === targetIndex) return
    const reordered = [...events]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(targetIndex, 0, moved)
    setEvents(reordered)
    try {
      await adminEventsApi.reorder({ orderedIds: reordered.map((e) => e.id) })
    } catch (err) {
      console.error('Failed to reorder events:', err)
      fetchEvents()
    }
  }

  const field = 'w-full px-4 py-2 border border-gray-300 rounded-lg bg-white'

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Мероприятия</h1>

      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">Выставки и события — отображаются на сайте</p>
        <button onClick={openCreate} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="h-5 w-5 mr-2" />
          Добавить мероприятие
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-gray-500">Нет мероприятий. Добавьте первое.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10" />
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Мероприятие</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Даты</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map((e, index) => (
                <tr
                  key={e.id}
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
                      {e.image_url ? (
                        <img src={e.image_url} alt={e.title} className="h-12 w-20 rounded border border-gray-200 bg-white object-contain p-1" />
                      ) : (
                        <div className="h-12 w-20 rounded bg-blue-50 flex items-center justify-center">
                          <CalendarDays className="h-5 w-5 text-blue-400" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{e.title}</span>
                          {!!e.event_prices_count && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700"
                              title={t('events.prices_count_title', { count: e.event_prices_count })}
                            >
                              <Tag className="h-3 w-3" />
                              {e.event_prices_count}
                            </span>
                          )}
                        </div>
                        {e.venue && <div className="text-xs text-gray-400">{e.venue}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {fmtDate(e.start_date)}
                    {e.end_date ? ` – ${fmtDate(e.end_date)}` : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-sm ${e.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {e.is_active ? 'Активно' : 'Скрыто'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-1">
                      <Link
                        href={`/admin/events/${e.id}/prices`}
                        aria-label={t('events.prices_action')}
                        title={t('events.prices_action')}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-violet-700 hover:bg-violet-50"
                      >
                        <Tag className="h-4 w-4" />
                        {t('events.prices_action')}
                      </Link>
                      <button type="button" onClick={() => openEdit(e)} aria-label="Редактировать" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50">
                        <Edit className="h-5 w-5" />
                      </button>
                      <button type="button" onClick={() => setDeleteConfirm(e)} aria-label="Удалить" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / edit modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Редактировать мероприятие' : 'Новое мероприятие'}
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setShowModal(false)} disabled={saving} className={btn.secondary}>Отмена</button>
            <button type="submit" form="event-form" disabled={saving} className={btn.primary}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </>
        }
      >
        <form id="event-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Название (RU) *</label>
              <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={field} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Название (UZ)</label>
                <input type="text" value={form.title_uz} onChange={(e) => setForm({ ...form, title_uz: e.target.value })} className={field} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Название (EN)</label>
                <input type="text" value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} className={field} />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Описание (RU)</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={field} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Описание (UZ)</label>
                <textarea rows={2} value={form.description_uz} onChange={(e) => setForm({ ...form, description_uz: e.target.value })} className={field} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Описание (EN)</label>
                <textarea rows={2} value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} className={field} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Изображение</label>
            <div className="flex items-center gap-3">
              {form.image_url ? (
                <div className="relative">
                  <img src={form.image_url} alt="" className="h-16 w-32 rounded-lg border bg-white object-contain p-1" />
                  <button type="button" onClick={() => setForm((p) => ({ ...p, image_url: '' }))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : null}
              <label className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                {uploading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" /> : <Upload className="h-4 w-4" />}
                Загрузить фото
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500">{t('events.image_hint')}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Дата начала *</label>
              <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={field} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Дата окончания</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={field} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Место проведения</label>
              <input type="text" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className={field} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Город</label>
              <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={field} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Ссылка (сайт мероприятия)</label>
            <input type="url" placeholder="https://" value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} className={field} />
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="ev_active" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 text-blue-600 rounded" />
            <label htmlFor="ev_active" className="ml-2 text-sm">Активно (показывать на сайте)</label>
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Удалить мероприятие?"
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setDeleteConfirm(null)} disabled={isDeleting} className={btn.secondary}>Отмена</button>
            <button type="button" onClick={handleConfirmDelete} disabled={isDeleting} className={btn.danger}>
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </button>
          </>
        }
      >
        {deleteConfirm && (
          <p className="text-gray-600">
            Вы уверены, что хотите удалить <strong>&quot;{deleteConfirm.title}&quot;</strong>?
          </p>
        )}
      </Modal>
    </>
  )
}
