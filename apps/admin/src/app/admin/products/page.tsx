'use client';

import { useEffect, useState, useCallback } from 'react'
import { Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Upload, X, AlertTriangle, Star, GripVertical, Pin, PinOff, List, ArrowUpDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal, btn } from '@/components/Modal'
import { adminProductsApi, adminCategoriesApi, adminUploadApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n/useTranslation'

// Max photos per product (the API rejects more)
const MAX_PHOTOS = 5

// Products loaded at once in the sort-order view
const SORT_LIMIT = 200

// Special value for custom input
const CUSTOM_VALUE = '__custom__'

// Predefined color options
const COLOR_OPTIONS = [
  { value: '', label: 'Выберите цвет' },
  { value: 'Белый', label: 'Белый' },
  { value: 'Черный', label: 'Черный' },
  { value: 'Серый', label: 'Серый' },
  { value: 'Коричневый', label: 'Коричневый' },
  { value: 'Бежевый', label: 'Бежевый' },
  { value: 'Красный', label: 'Красный' },
  { value: 'Синий', label: 'Синий' },
  { value: 'Зеленый', label: 'Зеленый' },
  { value: 'Желтый', label: 'Желтый' },
  { value: 'Оранжевый', label: 'Оранжевый' },
  { value: 'Розовый', label: 'Розовый' },
  { value: 'Фиолетовый', label: 'Фиолетовый' },
  { value: 'Золотой', label: 'Золотой' },
  { value: 'Серебряный', label: 'Серебряный' },
  { value: 'Прозрачный', label: 'Прозрачный' },
  { value: 'Разноцветный', label: 'Разноцветный' },
  { value: CUSTOM_VALUE, label: '+ Другой цвет...' },
]

// Predefined material options
const MATERIAL_OPTIONS = [
  { value: '', label: 'Выберите материал' },
  { value: 'Дерево', label: 'Дерево' },
  { value: 'Металл', label: 'Металл' },
  { value: 'Пластик', label: 'Пластик' },
  { value: 'Стекло', label: 'Стекло' },
  { value: 'Ткань', label: 'Ткань' },
  { value: 'Кожа', label: 'Кожа' },
  { value: 'Искусственная кожа', label: 'Искусственная кожа' },
  { value: 'МДФ', label: 'МДФ' },
  { value: 'ДСП', label: 'ДСП' },
  { value: 'Фанера', label: 'Фанера' },
  { value: 'Ротанг', label: 'Ротанг' },
  { value: 'Бамбук', label: 'Бамбук' },
  { value: 'Алюминий', label: 'Алюминий' },
  { value: 'Нержавеющая сталь', label: 'Нержавеющая сталь' },
  { value: 'Комбинированный', label: 'Комбинированный' },
  { value: CUSTOM_VALUE, label: '+ Другой материал...' },
]

// Helper to check if a value is a predefined option
const isPredefinedColor = (value: string) => COLOR_OPTIONS.some(opt => opt.value === value && opt.value !== CUSTOM_VALUE)
const isPredefinedMaterial = (value: string) => MATERIAL_OPTIONS.some(opt => opt.value === value && opt.value !== CUSTOM_VALUE)

// Format number with thousands separator (space)
const formatThousands = (value: string): string => {
  const num = value.replace(/\D/g, '')
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// Remove formatting to get raw number
const unformatThousands = (value: string): string => {
  return value.replace(/\s/g, '')
}

interface Specification {
  width: string | null
  height: string | null
  depth: string | null
  weight: string | null
  color: string | null
  material: string | null
}

interface Product {
  id: string
  name: string
  name_uz?: string | null
  name_en?: string | null
  description?: string | null
  description_uz?: string | null
  description_en?: string | null
  category_id: string
  category_name: string
  photos: string[]
  specifications: Specification
  daily_price: number
  total_stock: number
  is_active: boolean
  is_pinned: boolean
  display_order: number
  created_at: string
}

interface Category {
  id: string
  name: string
}

export default function Products() {
  const { t } = useTranslation()
  const [view, setView] = useState<'list' | 'sort'>('list')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [draggedPhotoIndex, setDraggedPhotoIndex] = useState<number | null>(null)
  const [useCustomColor, setUseCustomColor] = useState(false)
  const [useCustomMaterial, setUseCustomMaterial] = useState(false)

  // Helper to check if product has complete specs (required for new products)
  const hasCompleteSpecs = (specs: { color?: string; material?: string }) => {
    return !!(specs.color && specs.material)
  }

  // Helper to check if product is complete (has photo, specs, etc.)
  const isProductComplete = (product: Product) => {
    return (
      product.photos.length > 0 &&
      product.specifications?.color &&
      product.specifications?.material
    )
  }

  // Form state - use strings for numeric inputs to allow proper editing
  const [form, setForm] = useState({
    name: '',
    name_uz: '',
    name_en: '',
    description: '',
    description_uz: '',
    description_en: '',
    category_id: '',
    daily_price: '',
    total_stock: '',
    is_active: true,
    is_pinned: false,
    spec_width: '',
    spec_height: '',
    spec_depth: '',
    spec_weight: '',
    spec_color: '',
    spec_material: '',
  })

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [page, categoryFilter])

  const fetchCategories = async () => {
    try {
      const { data } = await adminCategoriesApi.list()
      if (data.success) {
        setCategories(data.data.items || data.data)
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = {
        page: page.toString(),
        limit: '20',
      }
      if (categoryFilter) params.category_id = categoryFilter
      if (search) params.search = search

      const { data } = await adminProductsApi.list(params)
      if (data.success) {
        setProducts(data.data.items)
        setTotalPages(data.data.meta?.totalPages || 1)
      }
    } catch (err) {
      console.error('Failed to fetch products:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchProducts()
  }

  const openCreateModal = () => {
    setEditingProduct(null)
    setForm({
      name: '',
      name_uz: '',
      name_en: '',
      description: '',
      description_uz: '',
      description_en: '',
      category_id: categories[0]?.id || '',
      daily_price: '',
      total_stock: '1',
      is_active: true,
      is_pinned: false,
      spec_width: '',
      spec_height: '',
      spec_depth: '',
      spec_weight: '',
      spec_color: '',
      spec_material: '',
    })
    setPhotos([])
    setUseCustomColor(false)
    setUseCustomMaterial(false)
    setShowModal(true)
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    const colorValue = product.specifications?.color || ''
    const materialValue = product.specifications?.material || ''
    const isCustomColor = Boolean(colorValue && !isPredefinedColor(colorValue))
    const isCustomMaterial = Boolean(materialValue && !isPredefinedMaterial(materialValue))

    setForm({
      name: product.name,
      name_uz: product.name_uz || '',
      name_en: product.name_en || '',
      description: product.description || '',
      description_uz: product.description_uz || '',
      description_en: product.description_en || '',
      category_id: product.category_id,
      daily_price: product.daily_price != null ? product.daily_price.toString() : '',
      total_stock: product.total_stock != null ? product.total_stock.toString() : '',
      is_active: product.is_active,
      is_pinned: !!product.is_pinned,
      spec_width: product.specifications?.width || '',
      spec_height: product.specifications?.height || '',
      spec_depth: product.specifications?.depth || '',
      spec_weight: product.specifications?.weight || '',
      spec_color: colorValue,
      spec_material: materialValue,
    })
    setPhotos(product.photos || [])
    setUseCustomColor(isCustomColor)
    setUseCustomMaterial(isCustomMaterial)
    setShowModal(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Check limit
    if (photos.length + files.length > MAX_PHOTOS) {
      toast.error(t('products.photos_max', { max: MAX_PHOTOS }))
      e.target.value = ''
      return
    }

    setUploadingImages(true)
    try {
      // Upload files one by one to ensure reliability
      const uploadedUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const { data } = await adminUploadApi.uploadImage(files[i])

        if (data.success && data.data?.url) {
          uploadedUrls.push(data.data.url)
        } else {
          console.error('Upload failed for file:', files[i].name, data)
        }
      }

      if (uploadedUrls.length > 0) {
        setPhotos((prev) => [...prev, ...uploadedUrls].slice(0, MAX_PHOTOS))
      }
    } catch (err) {
      console.error('Failed to upload images:', err)
      alert('Ошибка загрузки изображения')
    } finally {
      setUploadingImages(false)
      // Reset input
      e.target.value = ''
    }
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  // Set photo as main (move to first position)
  const setMainPhoto = (index: number) => {
    if (index === 0) return // Already main
    setPhotos((prev) => {
      const newPhotos = [...prev]
      const [photo] = newPhotos.splice(index, 1)
      newPhotos.unshift(photo)
      return newPhotos
    })
  }

  // Drag and drop handlers for photo reordering
  const handleDragStart = (index: number) => {
    setDraggedPhotoIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedPhotoIndex === null || draggedPhotoIndex === index) return
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (draggedPhotoIndex === null || draggedPhotoIndex === targetIndex) {
      setDraggedPhotoIndex(null)
      return
    }

    setPhotos((prev) => {
      const newPhotos = [...prev]
      const [draggedPhoto] = newPhotos.splice(draggedPhotoIndex, 1)
      newPhotos.splice(targetIndex, 0, draggedPhoto)
      return newPhotos
    })
    setDraggedPhotoIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedPhotoIndex(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate numeric fields
    const dailyPrice = parseInt(form.daily_price, 10)
    const totalStock = parseInt(form.total_stock, 10)

    if (isNaN(dailyPrice) || dailyPrice <= 0) {
      alert('Введите корректную цену')
      return
    }

    if (isNaN(totalStock) || totalStock <= 0) {
      alert('Введите корректное количество')
      return
    }

    // For new products, require at least color and material
    if (!editingProduct) {
      if (!form.spec_color) {
        alert('Выберите цвет товара')
        return
      }
      if (!form.spec_material) {
        alert('Выберите материал товара')
        return
      }
      if (photos.length === 0) {
        alert('Добавьте хотя бы одно фото товара')
        return
      }
    }

    setIsSubmitting(true)
    try {
      const body = {
        name: form.name,
        name_uz: form.name_uz || null,
        name_en: form.name_en || null,
        description: form.description || null,
        description_uz: form.description_uz || null,
        description_en: form.description_en || null,
        category_id: form.category_id,
        photos: photos,
        daily_price: dailyPrice,
        total_stock: totalStock,
        is_active: form.is_active,
        is_pinned: form.is_pinned,
        specifications: {
          width: form.spec_width || null,
          height: form.spec_height || null,
          depth: form.spec_depth || null,
          weight: form.spec_weight || null,
          color: form.spec_color || null,
          material: form.spec_material || null,
        },
      }

      let data
      if (editingProduct) {
        const response = await adminProductsApi.update(editingProduct.id, body)
        data = response.data
      } else {
        const response = await adminProductsApi.create(body)
        data = response.data
      }

      if (data.success) {
        setShowModal(false)
        setEditingProduct(null)
        fetchProducts()
      }
    } catch (err) {
      console.error('Failed to save product:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (productId: string) => {
    try {
      const { data } = await adminProductsApi.delete(productId)
      if (data.success) {
        setDeleteConfirm(null)
        fetchProducts()
      }
    } catch (err) {
      console.error('Failed to delete product:', err)
    }
  }

  const toggleProductStatus = async (product: Product) => {
    try {
      const { data } = await adminProductsApi.update(product.id, {
        is_active: !product.is_active,
      })
      if (data.success) {
        fetchProducts()
      }
    } catch (err) {
      console.error('Failed to toggle product status:', err)
    }
  }

  const togglePinned = async (product: Product) => {
    const next = !product.is_pinned
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, is_pinned: next } : p)))
    try {
      const { data } = await adminProductsApi.update(product.id, { is_pinned: next })
      if (data.success) {
        toast.success(next ? t('products.pinned_toast') : t('products.unpinned_toast'))
        fetchProducts()
      }
    } catch (err) {
      console.error('Failed to toggle product pin:', err)
      toast.error(t('common.save_error'))
      fetchProducts()
    }
  }

  const formatPrice = (price: number) => {
    if (price == null || Number.isNaN(Number(price))) return '—'
    return new Intl.NumberFormat('ru-RU').format(price) + ' сум'
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Товары</h1>

      {/* View switch: list / storefront sort order */}
      <div role="tablist" className="mb-6 inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
        {([
          { key: 'list', label: t('products.tab_list'), icon: List },
          { key: 'sort', label: t('products.tab_sort'), icon: ArrowUpDown },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={view === tab.key}
            onClick={() => {
              setView(tab.key)
              if (tab.key === 'list') fetchProducts()
            }}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === tab.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {view === 'sort' ? (
        <ProductSortOrder formatPrice={formatPrice} />
      ) : (
      <>
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск товаров..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value)
            setPage(1)
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Все категории</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <button
          onClick={openCreateModal}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Добавить товар
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Товар
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Категория
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Цена / день
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      На складе
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
                  {products.map((product) => {
                    const incomplete = !isProductComplete(product)
                    return (
                    <tr key={product.id} className={`hover:bg-gray-50 ${incomplete ? 'bg-amber-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-12 h-12 mr-3 relative">
                            {product.photos[0] ? (
                              <img
                                src={product.photos[0]}
                                alt={product.name}
                                className="w-12 h-12 rounded object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium truncate max-w-[200px]">{product.name}</span>
                              {product.is_pinned && (
                                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
                                  <Pin className="h-3 w-3" />
                                  {t('products.pinned_badge')}
                                </span>
                              )}
                            </div>
                            {incomplete && (
                              <div className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                                <AlertTriangle className="h-3 w-3" />
                                Неполная информация
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.category_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">
                        {formatPrice(product.daily_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {product.total_stock != null ? `${product.total_stock} шт` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleProductStatus(product)}
                          className={`px-2 py-1 rounded text-sm ${
                            product.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {product.is_active ? 'Активен' : 'Неактивен'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => togglePinned(product)}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                              product.is_pinned
                                ? 'text-orange-600 hover:bg-orange-50'
                                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                            }`}
                            aria-label={product.is_pinned ? t('products.unpin_action') : t('products.pin_action')}
                            aria-pressed={product.is_pinned}
                            title={product.is_pinned ? t('products.unpin_action') : t('products.pin_action')}
                          >
                            {product.is_pinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(product)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                            aria-label="Редактировать"
                            title="Редактировать"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(product.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                            aria-label="Удалить"
                            title="Удалить"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}

                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Страница {page} из {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      </>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingProduct(null)
        }}
        title={editingProduct ? 'Редактировать товар' : 'Добавить товар'}
        size="lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShowModal(false)
                setEditingProduct(null)
              }}
              className={btn.secondary}
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              form="product-form"
              disabled={isSubmitting}
              className={btn.primary}
            >
              {isSubmitting ? 'Сохранение...' : 'Сохранить'}
            </button>
          </>
        }
      >
            <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Название (RU) *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      placeholder="Название на русском"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Название (UZ)</label>
                      <input
                        type="text"
                        value={form.name_uz}
                        onChange={(e) => setForm({ ...form, name_uz: e.target.value })}
                        placeholder="O‘zbekcha nomi"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Название (EN)</label>
                      <input
                        type="text"
                        value={form.name_en}
                        onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                        placeholder="English name"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Описание (RU)</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={2}
                      placeholder="Описание на русском"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Описание (UZ)</label>
                      <textarea
                        value={form.description_uz}
                        onChange={(e) => setForm({ ...form, description_uz: e.target.value })}
                        rows={2}
                        placeholder="O‘zbekcha tavsif"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Описание (EN)</label>
                      <textarea
                        value={form.description_en}
                        onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                        rows={2}
                        placeholder="English description"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Photos Upload */}
                <div className="col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">
                    {t('products.photos_label', { max: MAX_PHOTOS })} {!editingProduct && <span className="text-red-500">*</span>}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Первое фото - главное. Перетащите для изменения порядка или нажмите ⭐ для выбора главного.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {photos.map((photo, index) => (
                      <div
                        key={index}
                        className={`relative group cursor-move ${
                          draggedPhotoIndex === index ? 'opacity-50' : ''
                        } ${index === 0 ? 'ring-2 ring-yellow-400' : ''}`}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                      >
                        <img
                          src={photo}
                          alt={`Photo ${index + 1}`}
                          className="w-24 h-24 object-cover rounded-lg border"
                        />
                        {/* Drag handle indicator */}
                        <div className="absolute top-1 left-1 bg-black bg-opacity-50 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <GripVertical className="h-4 w-4 text-white" />
                        </div>
                        {/* Main photo indicator */}
                        {index === 0 && (
                          <div className="absolute bottom-1 left-1 bg-yellow-400 rounded px-1 py-0.5">
                            <span className="text-xs font-medium">Главное</span>
                          </div>
                        )}
                        {/* Set as main button */}
                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={() => setMainPhoto(index)}
                            className="absolute bottom-1 left-1 bg-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-yellow-100"
                            title="Сделать главным"
                          >
                            <Star className="h-3 w-3 text-gray-600" />
                          </button>
                        )}
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {photos.length < MAX_PHOTOS && (
                      <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-gray-50">
                        {uploadingImages ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-gray-400" />
                            <span className="text-xs text-gray-400 mt-1">Добавить</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImages}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Категория *
                  </label>
                  <select
                    value={form.category_id}
                    onChange={(e) =>
                      setForm({ ...form, category_id: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Цена за день (сум) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatThousands(form.daily_price)}
                    onChange={(e) => {
                      // Remove formatting, allow only numeric input
                      const rawValue = unformatThousands(e.target.value)
                      setForm({ ...form, daily_price: rawValue })
                    }}
                    required
                    placeholder="50 000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Количество на складе *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.total_stock}
                    onChange={(e) => {
                      // Allow only numeric input
                      const value = e.target.value.replace(/[^0-9]/g, '')
                      setForm({ ...form, total_stock: value })
                    }}
                    required
                    placeholder="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
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
                    Активен
                  </label>
                </div>

                <div className="col-span-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_pinned"
                      checked={form.is_pinned}
                      onChange={(e) =>
                        setForm({ ...form, is_pinned: e.target.checked })
                      }
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <label htmlFor="is_pinned" className="ml-2 inline-flex items-center gap-1 text-sm">
                      <Pin className="h-3.5 w-3.5 text-orange-600" />
                      {t('products.pin_label')}
                    </label>
                  </div>
                  <p className="ml-6 mt-0.5 text-xs text-gray-500">{t('products.pin_hint')}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">
                  Характеристики {!editingProduct && <span className="text-red-500 text-sm">(обязательны для новых товаров)</span>}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Width with static unit */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Ширина
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.spec_width}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '')
                          setForm({ ...form, spec_width: value })
                        }}
                        placeholder="60"
                        className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">см</span>
                    </div>
                  </div>
                  {/* Height with static unit */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Высота
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.spec_height}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '')
                          setForm({ ...form, spec_height: value })
                        }}
                        placeholder="100"
                        className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">см</span>
                    </div>
                  </div>
                  {/* Depth with static unit */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Глубина
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.spec_depth}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '')
                          setForm({ ...form, spec_depth: value })
                        }}
                        placeholder="50"
                        className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">см</span>
                    </div>
                  </div>
                  {/* Weight with static unit */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Вес
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={form.spec_weight}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '')
                          setForm({ ...form, spec_weight: value })
                        }}
                        placeholder="5"
                        className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">кг</span>
                    </div>
                  </div>
                  {/* Color dropdown with custom input */}
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">
                      Цвет {!editingProduct && <span className="text-red-500">*</span>}
                    </label>
                    {useCustomColor ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={form.spec_color}
                          onChange={(e) =>
                            setForm({ ...form, spec_color: e.target.value })
                          }
                          placeholder="Введите цвет"
                          className={`flex-1 min-w-0 px-3 py-2 border rounded-lg ${
                            !form.spec_color && !editingProduct
                              ? 'border-amber-300 bg-amber-50'
                              : 'border-gray-300'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setUseCustomColor(false)
                            setForm({ ...form, spec_color: '' })
                          }}
                          className="flex-shrink-0 px-2 py-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
                          title="Выбрать из списка"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <select
                        value={isPredefinedColor(form.spec_color) ? form.spec_color : ''}
                        onChange={(e) => {
                          if (e.target.value === CUSTOM_VALUE) {
                            setUseCustomColor(true)
                            setForm({ ...form, spec_color: '' })
                          } else {
                            setForm({ ...form, spec_color: e.target.value })
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          !form.spec_color && !editingProduct
                            ? 'border-amber-300 bg-amber-50'
                            : 'border-gray-300'
                        }`}
                      >
                        {COLOR_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {/* Material dropdown with custom input */}
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">
                      Материал {!editingProduct && <span className="text-red-500">*</span>}
                    </label>
                    {useCustomMaterial ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={form.spec_material}
                          onChange={(e) =>
                            setForm({ ...form, spec_material: e.target.value })
                          }
                          placeholder="Введите материал"
                          className={`flex-1 min-w-0 px-3 py-2 border rounded-lg ${
                            !form.spec_material && !editingProduct
                              ? 'border-amber-300 bg-amber-50'
                              : 'border-gray-300'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setUseCustomMaterial(false)
                            setForm({ ...form, spec_material: '' })
                          }}
                          className="flex-shrink-0 px-2 py-2 text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg"
                          title="Выбрать из списка"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <select
                        value={isPredefinedMaterial(form.spec_material) ? form.spec_material : ''}
                        onChange={(e) => {
                          if (e.target.value === CUSTOM_VALUE) {
                            setUseCustomMaterial(true)
                            setForm({ ...form, spec_material: '' })
                          } else {
                            setForm({ ...form, spec_material: e.target.value })
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg ${
                          !form.spec_material && !editingProduct
                            ? 'border-amber-300 bg-amber-50'
                            : 'border-gray-300'
                        }`}
                      >
                        {MATERIAL_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

            </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Удалить товар?"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDeleteConfirm(null)}
              className={btn.secondary}
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className={btn.danger}
            >
              Удалить
            </button>
          </>
        }
      >
        {deleteConfirm && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="pt-1">
                <p className="text-gray-700">Вы уверены, что хотите удалить этот товар?</p>
                {(() => {
                  const product = products.find((p) => p.id === deleteConfirm)
                  return product ? (
                    <p className="mt-0.5 text-sm text-gray-500">{product.name}</p>
                  ) : null
                })()}
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-700">
                <strong>Примечание:</strong> Если у товара есть история заказов, он будет
                деактивирован вместо полного удаления.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

/**
 * Storefront default order: every product on one page, drag-and-drop to
 * reorder (same pattern as categories). Pinned products always come first on
 * the site, so they stay grouped at the top here too.
 */
function ProductSortOrder({ formatPrice }: { formatPrice: (price: number) => string }) {
  const { t } = useTranslation()
  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const { data } = await adminProductsApi.list({ page: '1', limit: String(SORT_LIMIT) })
      if (data.success) {
        setItems(data.data.items || [])
        setTotal(data.data.meta?.total ?? (data.data.items || []).length)
      }
    } catch (err) {
      console.error('Failed to fetch products:', err)
      toast.error(t('common.network_error'))
    } finally {
      setLoading(false)
    }
  }

  const handleReorderDrop = async (targetIndex: number) => {
    const from = dragIndex
    setDragIndex(null)
    setDragOverIndex(null)
    if (from === null || from === targetIndex) return

    const moved = [...items]
    const [item] = moved.splice(from, 1)
    moved.splice(targetIndex, 0, item)
    // Pinned products always lead on the storefront: keep them grouped on top
    // (stable), so the list here matches what the site shows.
    const reordered = [...moved.filter((p) => p.is_pinned), ...moved.filter((p) => !p.is_pinned)]
    setItems(reordered) // optimistic

    setSaving(true)
    try {
      await adminProductsApi.reorder({ orderedIds: reordered.map((p) => p.id) })
      toast.success(t('products.sort_saved'))
    } catch (err) {
      console.error('Failed to reorder products:', err)
      toast.error(t('products.sort_error'))
      fetchAll() // revert to server order on failure
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="text-sm text-gray-600">{t('products.sort_hint')}</p>
        {saving && (
          <span className="flex shrink-0 items-center gap-2 text-sm text-blue-600">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            {t('common.saving')}
          </span>
        )}
      </div>
      {total > items.length && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          {t('products.sort_truncated', { count: items.length, total })}
        </div>
      )}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{t('products.sort_empty')}</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {items.map((p, index) => (
              <li
                key={p.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(ev) => { ev.preventDefault(); if (dragOverIndex !== index) setDragOverIndex(index) }}
                onDrop={() => handleReorderDrop(index)}
                onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
                className={`flex items-center gap-3 px-3 py-2 hover:bg-gray-50 ${dragIndex === index ? 'opacity-40' : ''} ${dragOverIndex === index && dragIndex !== null && dragIndex !== index ? 'border-t-2 border-blue-500' : ''} ${p.is_active ? '' : 'text-gray-400'}`}
              >
                <GripVertical className="h-5 w-5 shrink-0 text-gray-400 cursor-grab active:cursor-grabbing" />
                <span className="w-8 shrink-0 text-right text-xs tabular-nums text-gray-400">{index + 1}</span>
                {p.photos[0] ? (
                  <img src={p.photos[0]} alt={p.name} className="h-9 w-9 shrink-0 rounded object-cover" />
                ) : (
                  <div className="h-9 w-9 shrink-0 rounded bg-gray-200 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{p.name}</span>
                    {p.is_pinned && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
                        <Pin className="h-3 w-3" />
                        {t('products.pinned_badge')}
                      </span>
                    )}
                    {!p.is_active && (
                      <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{t('products.inactive')}</span>
                    )}
                  </div>
                </div>
                <span className="hidden sm:block w-48 shrink-0 truncate text-sm text-gray-500">{p.category_name}</span>
                <span className="hidden md:block w-32 shrink-0 text-right text-sm text-gray-500">{formatPrice(p.daily_price)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
