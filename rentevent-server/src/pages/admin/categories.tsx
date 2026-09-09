import { useEffect, useState } from 'react'
import Head from 'next/head'
import AdminLayout from '@/components/AdminLayout'
import { Plus, Edit, Trash2, GripVertical, Upload, X, Grid3X3, AlertTriangle } from 'lucide-react'
import IconPicker, { IconByName, iconCatalog } from '@/components/IconPicker'

interface Category {
  id: string
  name: string
  image_url: string | null
  icon_name: string | null
  parent_category_id: string | null
  parent: { id: string; name: string } | null
  display_order: number
  is_active: boolean
  products_count: number
  children_count: number
  created_at: string
}

interface DeleteConfirmation {
  category: Category
  requiresForce: boolean
  productsCount: number
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showIconPicker, setShowIconPicker] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    image_url: '',
    icon_name: '' as string | null,
    parent_category_id: null as string | null,
    is_active: true,
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/categories')
      const json = await res.json()
      if (json.success) {
        setCategories(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    } finally {
      setLoading(false)
    }
  }

  // Get top-level categories (for parent dropdown)
  const topLevelCategories = categories.filter((c) => !c.parent_category_id)

  const openCreateModal = () => {
    setEditingCategory(null)
    setForm({ name: '', image_url: '', icon_name: null, parent_category_id: null, is_active: true })
    setError(null)
    setShowModal(true)
  }

  const openEditModal = (category: Category) => {
    setEditingCategory(category)
    setForm({
      name: category.name,
      image_url: category.image_url || '',
      icon_name: category.icon_name || null,
      parent_category_id: category.parent_category_id || null,
      is_active: category.is_active,
    })
    setError(null)
    setShowModal(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'rentevent/categories')

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()

      if (json.success) {
        setForm((prev) => ({ ...prev, image_url: json.data.url, icon_name: null }))
      }
    } catch (err) {
      console.error('Failed to upload image:', err)
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  const removeImage = () => {
    setForm((prev) => ({ ...prev, image_url: '' }))
  }

  const handleIconSelect = (iconName: string | null) => {
    setForm((prev) => ({ ...prev, icon_name: iconName, image_url: '' }))
  }

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const isEditing = !!editingCategory
      const res = await fetch('/api/admin/categories', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEditing && { id: editingCategory.id }),
          name: form.name,
          image_url: form.image_url || null,
          icon_name: form.icon_name || null,
          parent_category_id: form.parent_category_id || null,
          is_active: form.is_active,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setShowModal(false)
        fetchCategories()
      } else {
        setError(json.message || 'Ошибка при сохранении категории')
      }
    } catch (err) {
      console.error('Failed to save category:', err)
      setError('Ошибка сети. Проверьте подключение.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = async (category: Category) => {
    // First, try to delete without force to check if there are products
    try {
      const res = await fetch(`/api/admin/categories?id=${category.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (json.success) {
        // Deleted successfully (no products)
        fetchCategories()
      } else if (json.requires_confirmation) {
        // Has products, show confirmation modal
        setDeleteConfirm({
          category,
          requiresForce: true,
          productsCount: json.products_count,
        })
      } else {
        // Show simple confirmation for categories without products
        setDeleteConfirm({
          category,
          requiresForce: false,
          productsCount: 0,
        })
      }
    } catch (err) {
      console.error('Failed to check category:', err)
    }
  }

  const handleConfirmDelete = async (force: boolean) => {
    if (!deleteConfirm) return

    setIsDeleting(true)
    try {
      const url = force
        ? `/api/admin/categories?id=${deleteConfirm.category.id}&force=true`
        : `/api/admin/categories?id=${deleteConfirm.category.id}`

      const res = await fetch(url, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (json.success) {
        setDeleteConfirm(null)
        fetchCategories()
      }
    } catch (err) {
      console.error('Failed to delete category:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  // Check if category is complete (has image or icon)
  const isCategoryComplete = (category: Category) => {
    return !!(category.icon_name || category.image_url)
  }

  const renderCategoryIcon = (category: Category) => {
    if (category.icon_name && iconCatalog[category.icon_name]) {
      return (
        <div className="h-10 w-10 rounded bg-blue-100 mr-3 flex items-center justify-center text-blue-600">
          <IconByName name={category.icon_name} className="h-6 w-6" />
        </div>
      )
    }
    if (category.image_url) {
      return (
        <img
          src={category.image_url}
          alt={category.name}
          className="h-10 w-10 rounded object-cover mr-3"
        />
      )
    }
    return (
      <div className="h-10 w-10 rounded bg-amber-100 mr-3 flex items-center justify-center">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Категории - RentEvent Admin</title>
      </Head>
      <AdminLayout title="Категории">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            Управление категориями товаров
          </p>
          <button
            onClick={openCreateModal}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Добавить категорию
          </button>
        </div>

        {/* Categories List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Нет категорий. Создайте первую категорию.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-10"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Категория
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Товаров
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categories.map((category) => {
                  const incomplete = !isCategoryComplete(category)
                  return (
                  <tr key={category.id} className={`hover:bg-gray-50 ${incomplete ? 'bg-amber-50' : ''}`}>
                    <td className="px-2">
                      <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center" style={{ paddingLeft: category.parent_category_id ? 24 : 0 }}>
                        {category.parent_category_id && (
                          <span className="text-gray-300 mr-2">└</span>
                        )}
                        {renderCategoryIcon(category)}
                        <div>
                          <span className="font-medium">{category.name}</span>
                          {category.parent && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              в {category.parent.name}
                            </div>
                          )}
                          {incomplete && (
                            <div className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                              <AlertTriangle className="h-3 w-3" />
                              Нет изображения
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {category.products_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          category.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {category.is_active ? 'Активна' : 'Неактивна'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(category)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(category)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}

              </tbody>
            </table>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingCategory ? 'Редактировать категорию' : 'Новая категория'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Название *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Родительская категория
                  </label>
                  <select
                    value={form.parent_category_id || ''}
                    onChange={(e) => setForm({ ...form, parent_category_id: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Нет (верхний уровень)</option>
                    {topLevelCategories
                      .filter((c) => c.id !== editingCategory?.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Иконка или изображение
                  </label>
                  <div className="flex items-center gap-3">
                    {/* Current selection preview */}
                    {form.icon_name ? (
                      <div className="relative">
                        <div className="w-16 h-16 rounded-lg border-2 border-blue-500 bg-blue-50 flex items-center justify-center">
                          <IconByName name={form.icon_name} className="h-8 w-8 text-blue-600" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, icon_name: null }))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : form.image_url ? (
                      <div className="relative">
                        <img
                          src={form.image_url}
                          alt="Category"
                          className="w-16 h-16 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : null}

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => setShowIconPicker(true)}
                        className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <Grid3X3 className="h-4 w-4" />
                        Выбрать иконку
                      </button>
                      <label className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                        {uploadingImage ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        Загрузить фото
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm({ ...form, is_active: e.target.checked })
                    }
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm">
                    Активна
                  </label>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Icon Picker Modal */}
        {showIconPicker && (
          <IconPicker
            value={form.icon_name}
            onChange={handleIconSelect}
            onClose={() => setShowIconPicker(false)}
          />
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
              {deleteConfirm.requiresForce ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-red-600">
                        Внимание!
                      </h3>
                      <p className="text-sm text-gray-500">
                        Категория содержит товары
                      </p>
                    </div>
                  </div>
                  <div className="mb-6">
                    <p className="text-gray-700 mb-3">
                      Вы собираетесь удалить категорию <strong>"{deleteConfirm.category.name}"</strong>, которая содержит{' '}
                      <strong className="text-red-600">{deleteConfirm.productsCount} товар(ов)</strong>.
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-700">
                        <strong>Все товары в этой категории будут удалены!</strong>
                        <br />
                        Товары с историей заказов будут деактивированы вместо удаления.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      disabled={isDeleting}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => handleConfirmDelete(true)}
                      disabled={isDeleting}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeleting ? 'Удаление...' : 'Удалить всё'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-4">Удалить категорию?</h3>
                  <p className="text-gray-600 mb-6">
                    Вы уверены, что хотите удалить категорию <strong>"{deleteConfirm.category.name}"</strong>?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      disabled={isDeleting}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={() => handleConfirmDelete(false)}
                      disabled={isDeleting}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeleting ? 'Удаление...' : 'Удалить'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  )
}
