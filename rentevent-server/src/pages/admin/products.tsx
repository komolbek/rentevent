import { useEffect, useState, useCallback } from 'react'
import Head from 'next/head'
import AdminLayout from '@/components/AdminLayout'
import { Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Upload, X, AlertTriangle, Star, GripVertical } from 'lucide-react'

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
  category_id: string
  category_name: string
  photos: string[]
  specifications: Specification
  daily_price: number
  total_stock: number
  is_active: boolean
  created_at: string
}

interface Category {
  id: string
  name: string
}

export default function Products() {
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
    category_id: '',
    daily_price: '',
    total_stock: '',
    is_active: true,
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
      const res = await fetch('/api/admin/categories')
      const json = await res.json()
      if (json.success) {
        setCategories(json.data)
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (categoryFilter) params.append('category_id', categoryFilter)
      if (search) params.append('search', search)

      const res = await fetch(`/api/admin/products?${params}`)
      const json = await res.json()
      if (json.success) {
        setProducts(json.data)
        setTotalPages(json.pagination.total_pages)
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
      category_id: categories[0]?.id || '',
      daily_price: '',
      total_stock: '1',
      is_active: true,
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
      category_id: product.category_id,
      daily_price: product.daily_price.toString(),
      total_stock: product.total_stock.toString(),
      is_active: product.is_active,
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
    if (photos.length + files.length > 3) {
      alert('Максимум 3 фото')
      return
    }

    setUploadingImages(true)
    try {
      // Upload files one by one to ensure reliability
      const uploadedUrls: string[] = []

      for (let i = 0; i < files.length; i++) {
        const formData = new FormData()
        formData.append('file', files[i])
        formData.append('folder', 'rentevent/products')

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        })
        const json = await res.json()

        if (json.success && json.data?.url) {
          uploadedUrls.push(json.data.url)
        } else {
          console.error('Upload failed for file:', files[i].name, json)
        }
      }

      if (uploadedUrls.length > 0) {
        setPhotos((prev) => [...prev, ...uploadedUrls].slice(0, 3))
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
      const url = editingProduct
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products'
      const method = editingProduct ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          category_id: form.category_id,
          photos: photos,
          daily_price: dailyPrice,
          total_stock: totalStock,
          is_active: form.is_active,
          specifications: {
            width: form.spec_width || null,
            height: form.spec_height || null,
            depth: form.spec_depth || null,
            weight: form.spec_weight || null,
            color: form.spec_color || null,
            material: form.spec_material || null,
          },
        }),
      })
      const json = await res.json()
      if (json.success) {
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
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        setDeleteConfirm(null)
        fetchProducts()
      }
    } catch (err) {
      console.error('Failed to delete product:', err)
    }
  }

  const toggleProductStatus = async (product: Product) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !product.is_active,
        }),
      })
      const json = await res.json()
      if (json.success) {
        fetchProducts()
      }
    } catch (err) {
      console.error('Failed to toggle product status:', err)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' сум'
  }

  return (
    <>
      <Head>
        <title>Товары - RentEvent Admin</title>
      </Head>
      <AdminLayout title="Товары">
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
                              <div className="font-medium truncate max-w-[200px]">{product.name}</div>
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
                          {product.total_stock} шт
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
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(product)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Редактировать"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(product.id)}
                              className="text-red-600 hover:text-red-800"
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

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4 my-8 p-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingProduct ? 'Редактировать товар' : 'Добавить товар'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">
                      Название *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  {/* Photos Upload */}
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">
                      Фотографии (макс. 3) {!editingProduct && <span className="text-red-500">*</span>}
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
                      {photos.length < 3 && (
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

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingProduct(null)
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={isSubmitting}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (() => {
          const product = products.find((p) => p.id === deleteConfirm)
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Удалить товар?</h3>
                    {product && (
                      <p className="text-sm text-gray-500">{product.name}</p>
                    )}
                  </div>
                </div>
                <div className="mb-6">
                  <p className="text-gray-600 mb-3">
                    Вы уверены, что хотите удалить этот товар?
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-700">
                      <strong>Примечание:</strong> Если у товара есть история заказов, он будет деактивирован вместо полного удаления.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
      </AdminLayout>
    </>
  )
}
